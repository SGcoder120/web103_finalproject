import express from 'express'
import passport from 'passport'

const router = express.Router()

router.get('/login/success', (req, res) => {
    if (req.user) {
        res.status(200).json({success: true, user: req.user})
    } else {
        res.status(200).json({ success: false, user: null })
    }
})

router.get('/login/failure', (req, res) => {
    res.status(401).json({success: false, message: "FAILURE"})
})

router.get('/logout', (req, res, next) => {
    // logout provided by passport
    req.logout((err) => {
        if (err) {
            return next(err)
        }
        // Destory provided by express-session
        req.session.destroy((err) => {
            res.clearCookie('connect.sid')
            res.json({status: 'logout', user: {}})
        })
    })
})

// Github authentication routes

router.get('/github', 
    passport.authenticate('github', {
        scope: ['read:user']
    })
)

router.get('/github/callback',
    (req, res, next) => {
      console.log('GitHub callback hit:', {
        query: req.query,
        sessionID: req.sessionID
      });
      next();
    },
    passport.authenticate('github', {
      successRedirect: 'https://web103-finalproject-royalflush-1.onrender.com/',
      failureRedirect: 'https://web103-finalproject-royalflush-1.onrender.com/'
    })
  );

export default router