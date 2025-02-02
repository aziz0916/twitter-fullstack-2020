const { User, Tweet, Reply, Like } = require('../models')
const helpers = require('../_helpers')

const tweetController = {
  getTweets: (req, res, next) => {
    const loginUser = helpers.getUser(req).id
    return Promise.all([
      User.findByPk(loginUser, { raw: true, nest: true }),
      Tweet.findAll({
        order: [['createdAt', 'DESC']],
        include: [User, Reply, Like]
      }),
      User.findAll({
        where: { role: 'user' },
        include: [
          { model: User, as: 'Followers' },
          { model: User, as: 'Followings' }
        ]
      })
    ])
      .then(([user, tweets, users]) => {
      // 後端驗證user存不存在
        if (!user) {
          req.flash('error_messages:', '還沒登入帳號或使用者不存在')
          return res.redirect('/login')
        }
        // tweets資料
        const tweetsData = tweets.map(tweet => ({
          ...tweet.toJSON(),
          repliesCount: tweet.Replies.length,
          likesCount: tweet.Likes.length,
          isLiked: tweet.Likes.some(l => l.UserId === loginUser)
        }))
        // users for top10
        const LIMIT = 10
        const userData = users
          .map(user => ({
            ...user.toJSON(),
            followerCount: user.Followers.length,
            isFollowed: helpers.getUser(req).Followings.some(f => f.id === user.id)
          }))
          .sort((a, b) => b.followerCount - a.followerCount)
          .slice(0, LIMIT)
        return res.render('tweets', { user, tweets: tweetsData, users: userData })
      })
      .catch(err => next(err))
  },
  getTweet: (req, res, next) => {
    const loginUser = helpers.getUser(req).id
    return Promise.all([
      Tweet.findByPk(req.params.id, {
        include: [
          User,
          Like,
          { model: Reply, include: User }
        ],
        order: [[Reply, 'createdAt', 'DESC']]
      }),
      User.findAll({
        where: { role: 'user' },
        include: [
          { model: User, as: 'Followers' },
          { model: User, as: 'Followings' }
        ]
      }),
      User.findByPk(loginUser, { raw: true, nest: true })
    ])
      .then(([tweet, users, user]) => {
        const tweetData = tweet.toJSON()
        const data = {
          replies: tweetData.Replies,
          replyCount: tweetData.Replies.length,
          likeCount: tweetData.Likes.length,
          isLiked: tweetData.Likes.some(l => l.UserId === loginUser)
        }
        const LIMIT = 10
        const userData = users
          .map(user => ({
            ...user.toJSON(),
            followerCount: user.Followers.length,
            isFollowed: helpers.getUser(req).Followings.some(f => f.id === user.id)
          }))
          .sort((a, b) => b.followerCount - a.followerCount)
          .slice(0, LIMIT)
        res.render('tweet', { tweet: tweetData, users: userData, data, user })
      })
      .catch(err => next(err))
  },
  postTweet: (req, res, next) => {
    const UserId = helpers.getUser(req).id
    const { description } = req.body
    if (!description) {
      req.flash('error_messages', '內容不可空白')
      return res.redirect('back')
    }
    if (description.length > 140) {
      req.flash('error_messages', '推文請在140字以內')
      return res.redirect('/tweets')
    }
    Tweet.create({
      UserId,
      description
    })
      .then(() => {
        req.flash('success_messages', '推文成功')
        res.redirect('back')
      })
      .catch(err => next(err))
  },
  postReply: (req, res, next) => {
    const UserId = helpers.getUser(req).id
    const tweetId = req.params.id
    const comment = req.body.comment
    console.log('comment:', comment)
    if (!comment) {
      req.flash('error_messages', '內容不可空白')
      return res.redirect('back')
    }
    Reply.create({
      UserId,
      TweetId: tweetId,
      comment
    })
      .then(() => {
        req.flash('success_messages', '回覆成功')
        // res.redirect('/tweets')
        res.redirect('back')
      })
      .catch(err => next(err))
  }
}

module.exports = tweetController
