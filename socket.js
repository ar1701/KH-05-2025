const Message = require('./model/Message');

module.exports = function(io) {
  io.on('connection', (socket) => {
    socket.on('join', (userId) => {
      socket.join(userId);
    });

    socket.on('private-message', async (data) => {
      try {
        const message = new Message({
          sender: data.senderId,
          receiver: data.receiverId,
          content: data.content
        });
        await message.save();
        
        io.to(data.receiverId).emit('new-message', {
          message: message,
          senderName: data.senderName
        });
        
        io.to(data.senderId).emit('message-sent', {
          message: message
        });
      } catch (error) {
        console.error('Error saving message:', error);
      }
    });

    socket.on('mark-as-read', async (messageId) => {
      try {
        await Message.findByIdAndUpdate(messageId, { read: true });
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });
  });
};