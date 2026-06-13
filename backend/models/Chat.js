const supabase = require('../supabaseClient');

const CHATS_TABLE = 'chats';
const MESSAGES_TABLE = 'messages';

const Chat = {
  async create({ participants, chatType = 'general' }) {
    const { data, error } = await supabase
      .from(CHATS_TABLE)
      .insert({
        participants,
        chat_type: chatType,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async findByParticipant(userId) {
    const { data, error } = await supabase
      .from(CHATS_TABLE)
      .select('*')
      .contains('participants', [userId])
      .order('last_message_at', { ascending: false, nullsFirst: false });
    if (error) throw error;
    return data || [];
  },

  async findByParticipants(userId1, userId2) {
    // Find chat that contains both participants
    const { data, error } = await supabase
      .from(CHATS_TABLE)
      .select('*')
      .contains('participants', [userId1, userId2])
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async findById(id) {
    const { data, error } = await supabase
      .from(CHATS_TABLE)
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async addMessage({ chatId, senderId, content, type = 'text', fileUrl }) {
    // Insert message
    const { data: message, error: msgError } = await supabase
      .from(MESSAGES_TABLE)
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        content,
        type,
        file_url: fileUrl,
      })
      .select()
      .single();
    if (msgError) throw msgError;

    // Update chat's last message
    await supabase
      .from(CHATS_TABLE)
      .update({
        last_message: content,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', chatId);

    return message;
  },

  async getMessages(chatId) {
    const { data, error } = await supabase
      .from(MESSAGES_TABLE)
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },
};

module.exports = Chat;
