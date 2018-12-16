var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var server = require('../server');
let id1, id2, post_id1, post_id2;

chai.use(chaiHttp);

suite('Functional Tests', function() {

  suite('API ROUTING FOR /api/threads/:board', function() {
    
    suite('POST', function() { 
      test('Test 1: Posting an empty thread to /API/THREADS/{BOARD}', done => {
        chai.request(server)
        .post('/api/threads/test')
        .send({}) //empty query
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status is OK')
          assert.equal(res.text, 'missing text or delete_password data', 'Query is missing text or a delete_password')
          done()
        })
      })//OK
           
      test('test 2: Posting a new thread with an incomplete query to /API/THREADS/{BOARD}', done => {
        chai.request(server)
        .post('/api/threads/test')
        .send({delete_password: 'incorrect password'})
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status OK')
          assert.equal(res.text, 'missing text or delete_password data', 'Incorrect query was used')
          done()
        })
      })
      
      test('Test 3: Post a new thread to /API/THREADS/{BOARD}', done => {
        chai.request(server)
        .post('/api/threads/test')
        .send({text: 'Test thread 1', delete_password: 'correct password'})
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status is OK')
          let regStr = new RegExp(`^http://${res.request.host}/b\/test`)
          assert.match(res.redirects[0], regStr, 'Redirects to /b/.. correctly')
          //console.log('res.redirects[0]: ' +res.redirects[0]); //http://127.0.0.1:34003/b/test?_id=5c14cf6514f6f318309b4059
          id1 = res.redirects[0].replace(/.+(_id=)/i ,'') //strips id string of 'any characters then _id='
          //console.log('id1 is: ' +id1); //test result: 5c14c44cd339c20ad477a546
          done()
        })
      })//OK
      
      test('Test 4: Post another new thread to /API/THREADS/{BOARD}', done => {
        chai.request(server)
        .post('/api/threads/test')
        .send({text: 'Test thread 2', delete_password: 'correct password'})
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status is OK')
          let regStr = new RegExp(`^http://${res.request.host}/b\/test`)
          assert.match(res.redirects[0], regStr, 'Redirects correctly')
          id2 = res.redirects[0].replace(/.+(_id=)/i ,'')
          console.log('id2 is: ' +id2); //id_2 is: 5c14d0b83c8d221ccad15d4c
          done()
        })
      })//OK
    }); //end of POST tests
    
    suite('GET', function() {
      test('Test 5: Get a full thread list from /API/THREADS/{BOARD}', done => {
        chai.request(server)
        .get('/api/threads/test')
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status is OK')
          assert.isArray(res.body, 'Result is an array')
          assert.property(res.body[0], '_id', 'Has a property _id')
          assert.property(res.body[0], 'text', 'Has the property text')
          assert.property(res.body[0], 'created_on', 'Has the property created_on')
          assert.property(res.body[0], 'bumped_on', 'Has the property bumped_on')
          assert.property(res.body[0], 'reply_count', 'Has the property reply_count')
          assert.property(res.body[0], 'replies', 'Has the property replies')
          assert.notProperty(res.body[0], 'delete_password', 'Has not property delete_password')
          assert.isArray(res.body[0].replies, 'Replies type is array')
          assert.equal(res.body[0].reply_count, 0, 'Default number of replies = 0')
          assert.equal(res.body[0].text, 'Test thread 2', 'Text is correct')
          assert.equal(res.body[0]._id, id2, 'ID is correct')
          console.log('test 4 res.body[0] text: ' +res.body[0].text) //res.body[0]: Test thread 2
          done()
        })
      })
    }); //end of GET tests
    
    suite('DELETE', function() {
      test('Test 6: Try to delete a thread using an incorrect password from /API/THREADS/{BOARD}', done => {
        chai.request(server)
        .delete('/api/threads/test')
        .send({delete_password: 'incorrect password'})
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status is OK')
          assert.equal(res.text, 'incorrect query', 'Incorrect query was used')
          //assert.equal(res.text, 'incorrect board or id', 'Incorrect id or board was entered')
          done()
        })
      })
               
      test('Test 7: Delete a thread at /API/THREADS/{BOARD}', done => {
        chai.request(server)
        .delete('/api/threads/test')
        .send({thread_id: id1, delete_password: 'correct password'})
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status is OK')
          assert.equal(res.text, 'success', 'Succesfully deleted thread')
          done()
        })
      })
    });
    
    suite('PUT', function() {
      test('Test 8: Try to report a thread with a missing query to /API/THREADS/{BOARD}', done => {
        chai.request(server)
        .put('/api/threads/test')
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status is OK')
          assert.equal(res.text, 'incorrect query', 'Incorrect query was used')
          done()
        })
      })
      
      test('Test 9: Report thread with incorrect board ref. to /API/THREADS/{BOARD}', done => {
        chai.request(server)
        .put('/api/threads/testEmpty')
        .send({thread_id: id1})
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status is OK')
          assert.equal(res.text, 'incorrect board or id', 'Succesfully reported thread')
          done()
        })
      })
      
      test('Test 10: Reporting thread /API/THREADS/{BOARD}', done => {
        chai.request(server)
        .put('/api/threads/test')
        .send({thread_id: id2})
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status is OK')
          assert.equal(res.text, 'reported', 'Succesfully reported thread')
          done()
        })
      })
    });

  });
    
  suite('API ROUTING FOR /api/replies/:board', function() {
    
    suite('POST', function() {
      
      test('Test 11: Post new reply with incomplete query to /API/REPLIES/{BOARD}', done => {
        chai.request(server)
        .post('/api/replies/test')
        .send({thread_id: id2, delete_password: 'correct password'})//missing reply text
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status is OK')
          assert.equal(res.text, 'incorrect query', 'Incorrect query was used')
          done()
        })
      })
      
      test('Test 12: Post new reply to /API/REPLIES/{BOARD}', done => {
        chai.request(server)
        .post('/api/replies/test')
        .send({thread_id: id2, text: 'Post #1 test text', delete_password: 'correct password'})
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status is OK')
          let regexStr = new RegExp(`^http://${res.request.host}/b\/test`)
          assert.match(res.redirects[0], regexStr, 'Redirects to /b/.. correctly')
          post_id1 = res.redirects[0].replace(/.+(_id=)/i ,'') //strips id string of 'any characters then _id='
          done()
        })
      })
      
      test('Test 13: Post 2nd new reply at /API/REPLIES/{BOARD}', done => {
        chai.request(server)
        .post('/api/replies/test')
        .send({thread_id: id2, text: 'Post #2 test text', delete_password: 'correct password'})
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status OK')
          let regStr = new RegExp(`^http://${res.request.host}/b\/test`)
          assert.match(res.redirects[0], regStr, 'Redirects correctly')
          post_id2 = res.redirects[0].replace(/.+(_id=)/i ,'')
          assert.notEqual(post_id1, post_id2, 'Post id is unique')
          done()
        })
      })
    });
    
    suite('GET', function() {
      test('Test 14: Get thread with no query at /API/REPLIES/{BOARD}', done => {
        chai.request(server)
        .get('/api/replies/test')
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status is OK')
          assert.equal(res.text, 'incorrect query', 'Incorrect query was used')
          done()
        })
      })
      
      test('Test 15: Get thread using thread id from /API/REPLIES/{BOARD}', done => {
        chai.request(server)
        .get('/api/replies/test')
        .query({thread_id: id2})
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status is OK')
          assert.isObject(res.body, 'Result is an object')
          assert.property(res.body, '_id', 'Has property _id')
          assert.property(res.body, 'created_on', 'Has property created_on')
          assert.property(res.body, 'bumped_on', 'Has property bumped_on')
          assert.isArray(res.body.replies, 'The replies property is an array')
          assert.isBelow(res.body.reply_count, 4, 'up to 3 replies can be shown');
          assert.notProperty(res.body, 'delete_password', 'Has not property delete_password')
          assert.equal(res.body.reply_count, 2, 'Two replies were posted')
          assert.equal(res.body.text, 'Test thread 2', 'Text is the same as what was entered')
          assert.equal(res.body._id, id2, 'ID is as was created')
          assert.isObject(res.body.replies[0], 'Replies element is an object')
          assert.property(res.body.replies[0], 'created_on', 'Has property created_on')
          assert.notProperty(res.body.replies[0], 'delete_password', 'Has not property delete_password')
          done()
        })
      })
    });
    
    suite('PUT', function() {
      test('Test 16: Put a post with no query at /API/REPLIES/{BOARD}', done => {
        chai.request(server)
        .put('/api/replies/test')
        .send({}) //empty query
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status is OK')
          assert.equal(res.text, 'incorrect query', 'Incorrect query was used')
          done()
        })
      })
                  
      test('Test 17: Try to report a post using an invalid post id to /API/REPLIES/{BOARD}', done => {
        chai.request(server)
        .put('/api/replies/test')
        .send({thread_id: id2, reply_id: 'incorrect post id'})
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status is OK')
          assert.equal(res.text, 'incorrect board or id', 'Incorrect query was used')
          done()
        })
      })
      
      test('Test 18: Report a post to /API/REPLIES/{BOARD}', done => {
        chai.request(server)
        .put('/api/replies/test')
        .send({thread_id: id2, reply_id: post_id1})
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status is OK')
          assert.equal(res.text, 'reported', 'Succesfully reported')
          done()
        })
      })
    });
    
    suite('DELETE', function() {
      test('Test 19: Try to delete a post using an empty query from /API/REPLIES/{BOARD}', done => {
        chai.request(server)
        .delete('/api/replies/test')
        .send({}) //empty query
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status is OK')
          assert.equal(res.text, 'incorrect query', 'Incorrect query was used')
          done()
        })
      })//OK
      
      test('Test 20: Try to delete a post using an incomplete query from /API/REPLIES/{BOARD}', done => {
        chai.request(server)
        .delete('/api/replies/test')
        .send({thread_id: id2, delete_password: 'correct password'})//missing reply_id
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status is OK')
          assert.equal(res.text, 'incorrect query', 'Incorrect query was used')
          done()
        })
      })
           
      test('Test 21: Try to delete a post using an invalid reply_id at /API/REPLIES/{BOARD}', done => {
        chai.request(server)
        .delete('/api/replies/test')
        .send({thread_id: id2, reply_id: 'incorrect post id', delete_password: 'correct password'})
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status is OK')
          assert.equal(res.text, 'incorrect post id', 'An incorrect post id was used')
          done()
        })
      })
      
      test('Test 22: Trying to Delete a post using an invalid password from /API/REPLIES/{BOARD}', done => {
        chai.request(server)
        .delete('/api/replies/test')
        .send({thread_id: id2, reply_id: post_id1, delete_password: 'incorrect password'})
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status OK')
          assert.equal(res.text, 'incorrect password', 'An incorrect password was used')
          done()
        })
      })
           
      test('Test 23: Delete a post from /API/REPLIES/{BOARD}', done => {
        chai.request(server)
        .delete('/api/replies/test')
        .send({thread_id: id2, reply_id: post_id1, delete_password: 'correct password'})
        .end((err, res) => {
          assert.equal(res.status, 200, 'Status is OK')
          assert.equal(res.text, 'success', 'Post was deleted OK')
          done()
        })
      })
      
    }); //end of DELETE reply test suite
  }); //End of reply test suite
}); //end of functional test suite
