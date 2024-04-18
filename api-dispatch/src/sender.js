var amqp = require('amqplib/callback_api');

// Connect to localhost
amqp.connect('amqp://localhost', function(error0, connection) {
  if (error0) {
    throw error0;
  }

  // Creates a channel, same as receiver
  connection.createChannel(function(error1, channel) {
    if (error1) {
      throw error1;
    }
    var queue = '632856';
    var msg = 'Hello world';

    channel.assertQueue(queue, {
      durable: false
    });

    // sends message to queue
    channel.sendToQueue(queue, Buffer.from(msg));
    console.log(" [x] Sent %s", msg);
  });

  // after 500ms closes amqp connection
  setTimeout(function() {
    connection.close();
    process.exit(0)
  }, 500);
});

