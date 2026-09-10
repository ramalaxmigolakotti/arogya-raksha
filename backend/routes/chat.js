const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Chat = require('../models/Chat');
const User = require('../models/User');

// Get user chats
router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.findByParticipant(req.userId);

    // Enrich with participant info
    const enriched = await Promise.all(
      chats.map(async (chat) => {
        const participants = await Promise.all(
          (chat.participants || []).map(async (pid) => {
            const user = await User.findById(pid);
            return user ? { id: user.id, name: user.name, avatar: user.avatar, role: user.role } : null;
          })
        );
        return { ...chat, participants: participants.filter(Boolean) };
      })
    );

    res.json({ success: true, chats: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create or get chat
router.post('/start', auth, async (req, res) => {
  try {
    const { targetUserId, chatType } = req.body;
    let chat = await Chat.findByParticipants(req.userId, targetUserId);

    if (!chat) {
      chat = await Chat.create({
        participants: [req.userId, targetUserId],
        chatType: chatType || 'general',
      });
    }

    // Enrich with participant info
    const participants = await Promise.all(
      (chat.participants || []).map(async (pid) => {
        const user = await User.findById(pid);
        return user ? { id: user.id, name: user.name, avatar: user.avatar, role: user.role } : null;
      })
    );

    res.json({ success: true, chat: { ...chat, participants: participants.filter(Boolean) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get chat messages
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const messages = await Chat.getMessages(req.params.id);

    // Enrich messages with sender info
    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const sender = await User.findById(msg.sender_id);
        return {
          ...msg,
          sender: sender ? { id: sender.id, name: sender.name, avatar: sender.avatar } : null,
        };
      })
    );

    res.json({ success: true, messages: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
