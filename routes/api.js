'use strict';

const   expect   = require('chai').expect,
        ObjectId = require('mongodb').ObjectId,
        mongoose = require('mongoose');

mongoose.set('useFindAndModify', false);
// Get Mongoose to use the global promise library
mongoose.Promise = global.Promise; 
mongoose.connect(process.env.DB, { useNewUrlParser: true }, (err, db) => {
  if(err)
  {
    console.log('Database connection error: ' +err);
  } 
  else {
    console.log('Successful database connection on port: ' +process.env.PORT);
  };
});

//Create mongoose schemas for replies and threads, to be converted into document models later
const repliesSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  created_on: {
    type: Date, 
    default: new Date()
  },
  delete_password: {
    type: String,
    required: true,
  },
  reported: {
    type: Boolean, 
    default: false
  }
})

const threadSchema = new mongoose.Schema({
  text: {
    type: String
  },
  created_on: {
    type: Date,
    default: Date.now,
  },
  bumped_on: {
    type: Date, 
    default: new Date()
  },
  reported: {
    type: Boolean, 
    default: false
  },
  delete_password: {
    type: String,
    required: true,
  },
  replies: [
    repliesSchema  
  ],
  reply_count: {
    type: Number, 
    default: 0
  }
})

module.exports = (app) => {
  
  //gets all data for a thread on the board selected - showAll. 
  app.route('/api/threads/:board')
  
    //get all boards with threads
    .get((req, res) => {
      let boardName = req.params.board.toLowerCase()
      console.log("get boardname: " +boardName); //test, testempty
      showAll(mongoose.model(boardName, threadSchema), res)
    })
    
    //post thread as a new mongoose document
    .post((req, res) => {
      if ((req.body.text == null || req.body.text == undefined) || 
          (req.body.delete_password == null || req.body.delete_password == undefined))
        {
          return res.end('missing text or delete_password data')
        }
    
      //create new database document using request parameters
      let boardName = req.params.board.toLowerCase();
      let document = new mongoose.model(boardName, threadSchema)
      ({
        text: req.body.text,
        reported: false,
        created_on: new Date(),
        bumped_on: new Date(),
        delete_password: req.body.delete_password
      })
      //add this new document to the database using function createThread
      createThread(document, res, boardName)
    })
  
    .put((req, res) => {
      if (!req.body.hasOwnProperty('thread_id')) return res.type('text').send('incorrect query')
      let boardName = req.params.board.toLowerCase();
      reportThread(mongoose.model(boardName, threadSchema), req.body.thread_id, res)
    })
  
    .delete((req, res) => {
      if (!req.body.hasOwnProperty('thread_id') || !req.body.hasOwnProperty('delete_password')) {
        return res.end('incorrect query')
      }
      let boardName = req.params.board.toLowerCase();
      deleteThread(mongoose.model(boardName, threadSchema), req.body.thread_id, req.body.delete_password, res)
    });
    
  app.route('/api/replies/:board')
    .get((req, res) => {
      if (!req.query.hasOwnProperty('thread_id')) return res.type('text').send('incorrect query') 
      let boardName = req.params.board.toLowerCase();
      showThread(mongoose.model(boardName, threadSchema), req.query.thread_id, res)
    })
  
    .post((req, res) => {
      if (!req.body.hasOwnProperty('thread_id') || 
          (!req.body.hasOwnProperty('text') || 
          !req.body.hasOwnProperty('delete_password') )) 
          {
            return res.end('incorrect query')
          }
      let boardName = req.params.board.toLowerCase();
      createPost(mongoose.model(boardName, threadSchema), req.body, res, boardName)
    })
  
    .put((req, res) => {
      if (!req.body.hasOwnProperty('thread_id') || !req.body.hasOwnProperty('reply_id'))
          {
          return res.end('incorrect query')
          }
          let boardName = req.params.board.toLowerCase();
          reportPost(mongoose.model(boardName, threadSchema), req.body.thread_id, req.body.reply_id, res)
      })
  
    .delete((req, res) => {
      if (!req.body.hasOwnProperty('thread_id') || 
          (!req.body.hasOwnProperty('reply_id') || 
           !req.body.hasOwnProperty('delete_password') ))
          {
            return res.end('incorrect query')
          }
      let boardName = req.params.board.toLowerCase();
      deletePost(mongoose.model(boardName, threadSchema), req.body.thread_id, req.body.reply_id, req.body.delete_password, res)
    });

  
  //8 helper functions
  
  //function to show board data (minus reported and delete_password fields, with latest 3 replies)
  const showAll = (board, res) => {
    board.find({}, {reported: 0, delete_password: 0, replies: {$slice: -3} })
      .sort({bumped_on: -1}) //sort by most recent first
      .limit( 10 ) //limit no of results to 10
      .exec((err, data) => {
        if (err) return res.send(err.message)
        res.json(data)
      })
  }

  //function to redirect & save a database document to a messageboard called 'boardName' (if existing)
  //with an id the same as the document id. 
  const createThread = (document, res, boardName) => {
    document.save((err, data) => {
      if (err) console.log('error in function createThread ' +err)
      res.redirect(`/b/${boardName}?_id=${data._id}`)
    })
  }

  //function to update the thread array 'reported' field and generate a text message 'reported'
  //when board and id data is correct
  const reportThread = (board, _id, res) => {
    board.findByIdAndUpdate(_id.trim(), {reported: true}, (err, data) => {
      if (err) return res.type('text').send('incorrect board or id')
      if (data !== null && data !== undefined) {res.type('text').send('reported')}
      else 
        res.end('incorrect board or id')
        //res.end('incorrect board or id')
    })
  }

  //function to delete a board if password matches and id is correct. 
  const deleteThread = (board, _id, password, res) => {
    _id = _id.trim();
    board.findById(_id, (err, data) => {
      if (err) return res.type('text').send('incorrect board or id');
      if (data.delete_password === password) {
        board.deleteOne({_id: _id}, (err, data) => {
          if (err) return res.type('text').send(err.message)
          res.end('success')
        })
      } else {
      res.end('incorrect password')
      }
    })
  }

  //function to update a board. Empty document { } specified, to update all documents in the collection.
  //$push adds the replies item to the array, $each modifies $push to add multiple updates.
  //[] means update all - no identifier set, $sort modifies $push to reorder 'created_on' array items.
  const showThread = (board, _id, res) => {
    board.updateMany(
      { }, 
      {"$push": {"replies": {"$each": [], "$sort": {"created_on": -1}}}}, (err, data) => {
        if (err) throw err
        board.findById(_id.trim())
          .select('-delete_password -reported -replies.reported -replies.delete_password')
          .exec((err, data) => {
          if (err) return res.type('text').send(err.message)
          res.json(data)
          console.log('here is the data: ' +data);
        })
    }) 
  }

  //function to update an existing board with a new post with a new date for 'bumped on'
  //note: necessary to add '{new: true}' or it will not return the updated document.
  const createPost = (board, body, res, boardName) => {
    board.findByIdAndUpdate(body.thread_id,
      {bumped_on: new Date(),
         $inc: {reply_count: 1}, 
         $push: {
           replies: 
            {
              text: body.text, 
              created_on: new Date(), 
              delete_password: body.delete_password
            }
          }
      }, {new: true}
    )
    .select('-reported -delete_password -replies.delete_password -replies.reported')
    .exec((err, data) => {
      if (err) return res.type('text')
    .send(err.message)
    res.redirect
      (
        '/b/' +boardName + 
        '/' +body.thread_id + 
        '?reply_id=' +data.replies[data.replies.length - 1]._id
      )
    })
  }
  
  //function to report post; updating the boolean reported to true and sending 'reported' when thread id and 
  //data is correct
  const reportPost = (board, thread_id, post_id, res) => {
    board.updateOne(
      {
        _id: thread_id.trim(), 
        'replies._id': post_id.trim()
      },
      {'replies.$.reported': true}, (err, data) => {
        console.log('data:' +data.n);
        if (err) return res.end('incorrect board or id')
        if (Boolean(data.n)) {
          res.end('reported')
        }
        else res.end('incorrect board or id')
      }
    )
  }

  //function to delete a post by using findById.
  //if replies.some function returns true for any post id in the board replies array then 
  //check password entered matches the one in the database, delete the post and decrement replies_count. 
  const deletePost = (board, thread_id, post_id, password, res) => {
    post_id = post_id.trim();
    board.findById(thread_id.trim(), (err, data) => {
      if (err) throw err
      if (data === null || data === undefined) return res.end('incorrect board or thread id')
      if (data.replies.some(
        function(item) {
          return post_id === item._id.toString();
        }
      )){
        if (password === data.replies.id(post_id).delete_password) {
          data.replies.id(post_id).text = '[deleted]'
          data.reply_count--;
          data.save()
        } else 
        return res.type('text').send('incorrect password')
      } else 
      return res.type('text').send('incorrect post id')
    //res.type('text').send('success')
    res.end('success');
    })
  } //end of function deletePost
}; //end of exports module