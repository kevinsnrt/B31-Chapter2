// Pemanggilan package express
const express = require('express')

// import package bcrypt
const bcrypt = require('bcrypt')

// import package express flash and express session
const flash = require('express-flash')
const session = require('express-session')

// import db connection
const db = require('./connection/db')

// import uploadFile middleware
const upload = require('./middlewares/uploadFile')

// Penggunaan package express
const app = express()

// set up template engine
app.set('view engine', 'hbs')

app.use('/public', express.static(__dirname + '/public'))
app.use('/uploads', express.static(__dirname + '/uploads'))
app.use(express.urlencoded({ extended: false }))
app.use(flash())

// Setup middleware session
app.use(
    session({
        cookie: {
            maxAge: 1000 * 60 * 60 * 2,
            secure: false,
            httpOnly: true
        },
        store: new session.MemoryStore(),
        saveUninitialized: true,
        resave: false,
        secret: "secretValue"
    })
)


const month = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'Desember'
]

// Membuat endpoint
app.get('/', function (req, res) {
    res.render('index')
})

app.get('/home', function (req, res) {
    res.render('index', {
        isLogin: req.session.isLogin,
        user: req.session.user,
    })
})

app.get('/blog', function (req, res) {
    let query = `SELECT name,image, author_id, tb_blog.id, title, content, post_at
                    FROM tb_blog
                    LEFT JOIN tb_user
                    ON tb_user.id = tb_blog.author_id 
                    ORDER BY id DESC`

    db.connect(function (err, client, done) {
        if (err) throw err
        client.query(query, function (err, result) {
            done()

            if (err) throw err
            let data = result.rows

            data = data.map((blog) => {
                return {
                    ...blog,
                    post_at: getFullTime(blog.post_at),
                    post_age: getDistanceTime(blog.post_at),
                    isLogin: req.session.isLogin
                }
            })

            res.render('blog', {
                isLogin: req.session.isLogin,
                user: req.session.user,
                blogs: data
            })
        })
    })
})

app.get('/add-blog', function (req, res) {

    if (!req.session.isLogin) {
        res.redirect('/home')
    }

    res.render('form-blog')
})

app.post('/blog', upload.single('image'), function (req, res) {
    // let title = req.body.title
    // let content = req.body.content

    let { title, content } = req.body

    let blog = {
        title: title,
        content,
        image: req.file.filename,
        author_id: req.session.user.id
    }

    db.connect((err, client, done) => {
        query = `INSERT INTO tb_blog(title, content, image, author_id) VALUES
                ('${blog.title}', '${blog.content}','${blog.image}', '${blog.author_id}')`

        if (err) throw err

        client.query(query, (err, result) => {
            done()
            if (err) throw err

            res.redirect('/blog')
        })
    })
})

app.get('/blog/:id', function (req, res) {
    let id = req.params.id

    let query = `SELECT * FROM tb_blog WHERE id = ${id} `
    db.connect((err, client, done) => {
        if (err) throw err

        client.query(query, (err, result) => {
            done()
            if (err) throw err

            result = result.rows[0]

            res.render('blog-detail', { blog: result })
        })
    })
})

app.get('/delete-blog/:id', function (req, res) {
    let { id } = req.params

    let query = `DELETE FROM tb_blog WHERE id = ${id} `

    db.connect((err, client, done) => {
        if (err) throw err

        client.query(query, (err, result) => {
            done()
            if (err) throw err

            res.redirect('/blog')
        })
    })
})

app.get('/update-blog/:id', function (req, res) {
    let { id } = req.params

    let query = `SELECT * FROM tb_blog WHERE id = ${id} `

    db.connect((err, client, done) => {
        if (err) throw err

        client.query(query, (err, result) => {
            done()
            if (err) throw err

            result = result.rows[0]

            res.render('update-blog', { blog: result })

        })
    })
})

app.post('/update-blog/:id', function (req, res) {
    let { id } = req.params
    let { title, content } = req.body

    let query = `UPDATE tb_blog SET title='${title}', content='${content}' WHERE id=${id}`

    db.connect((err, client, done) => {
        if (err) throw err

        client.query(query, (err, result) => {
            done()
            if (err) throw err

            res.redirect('/blog')
        })
    })
})

app.get('/contact-me', function (req, res) {
    res.render('contact')
})

app.get('/register', function (req, res) {
    res.render('register')
})

app.post('/register', function (req, res) {
    let { name, email, password } = req.body

    const hashPassword = bcrypt.hashSync(password, 10)

    db.connect((err, client, done) => {
        if (err) throw err

        let query = `INSERT INTO tb_user(name, email, password) VALUES
                        ('${name}','${email}','${hashPassword}')`

        client.query(query, (err, result) => {
            done()
            if (err) throw err

            req.flash('success', 'registration success')
            res.redirect('/login')
        })
    })
})

app.get('/login', function (req, res) {
    res.render('login')
})

app.post('/login', function (req, res) {
    let { email, password } = req.body

    db.connect((err, client, done) => {
        if (err) throw err
        let query = `SELECT * FROM tb_user WHERE email='${email}'`

        client.query(query, (err, result) => {
            done()
            if (err) throw err

            if (result.rowCount == 0) {
                req.flash('danger', 'email and password doesnt match')
                return res.redirect('/login')
            }

            let isMatch = bcrypt.compareSync(password, result.rows[0].password)

            if (isMatch) {
                req.session.isLogin = true
                req.session.user = {
                    id: result.rows[0].id,
                    email: result.rows[0].email,
                    name: result.rows[0].name
                }

                console.log(req.session.user);

                req.flash('success', 'Login Success')
                res.redirect('/blog')
            } else {
                req.flash('danger', 'email and password doesnt match')
                res.redirect('/login')
            }
        })
    })


})

app.get('/logout', function (req, res) {
    req.session.destroy()
    res.redirect('/home')
})

// Konfigurasi port application
const port = 5000
// app.listen(port, function () {
//     console.log(`server running on PORT ${port}`);
// })

app.listen(port, () => {
    console.log(`server running on PORT ${port}`);
})

function getFullTime(time) {

    const date = time.getDate()
    const monthIndex = time.getMonth()
    const year = time.getFullYear()

    let hours = time.getHours()
    let minutes = time.getMinutes()

    if (hours < 10) {
        hours = `0${hours}`
    }

    if (minutes < 10) {
        minutes = `0${minutes}`
    }

    return `${date} ${month[monthIndex]} ${year} ${hours}:${minutes} WIB`
}

function getDistanceTime(time) {
    const distance = new Date() - new Date(time)

    // convert to day
    const miliseconds = 1000
    const secondInMinute = 60
    const minutesInHour = 60
    const secondsInHour = secondInMinute * minutesInHour
    const hoursInDay = 23

    let dayDistance = distance / (miliseconds * secondsInHour * hoursInDay)

    if (dayDistance >= 1) {
        const time = Math.floor(dayDistance) + ' a day ago'
        return time
    } else {
        // Convert to hour
        let hourDistance = Math.floor(distance / (miliseconds * secondsInHour))
        // hourDistance = 0.1
        if (hourDistance > 0) {
            return hourDistance + ' hour ago'
        } else {
            // convert to minute
            const minuteDistance = Math.floor(distance / (miliseconds * secondInMinute))
            return minuteDistance + ' minute ago'
        }
    }

}
