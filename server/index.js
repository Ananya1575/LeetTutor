const express = require('express');
     const connectDB = require('./db');
     const bcrypt = require('bcryptjs');
     const jwt = require('jsonwebtoken');
     const User = require('./models/User');
     const Chat = require('./models/chat');
     const auth = require('./middleware/auth');
     const path = require('path');
     const { OpenAI } = require('openai');
     require('dotenv').config();

     const app = express();

     // Log environment variables (without exposing sensitive data)
     console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? 'Loaded' : 'Missing');
     console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Loaded' : 'Missing');
     console.log('JWT Secret:', process.env.JWT_SECRET ? 'Loaded' : 'Missing');

     // Initialize OpenAI
     const openai = new OpenAI({
         apiKey: process.env.OPENAI_API_KEY,
     });

     // Middleware
     app.use(express.json());
     app.use(express.static(path.join(__dirname, '../client')));

     // Connect to MongoDB
     connectDB();

     // Sign-up route
     app.post('/api/signup', async (req, res) => {
         const { username, email, password } = req.body;
         try {
             const existingUser = await User.findOne({ $or: [{ email }, { username }] });
             if (existingUser) {
                 return res.status(400).json({ message: 'Username or email already exists' });
             }
             const salt = await bcrypt.genSalt(10);
             const hashedPassword = await bcrypt.hash(password, salt);
             const user = new User({
                 username,
                 email,
                 password: hashedPassword,
             });
             await user.save();
             const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
                 expiresIn: '1d',
             });
             console.log(`User signed up: ${email}`);
             res.status(201).json({ token });
         } catch (error) {
             console.error('Error in /signup:', error.message, error.stack);
             res.status(500).json({ message: 'Server error', error: error.message });
         }
     });

     // Login route
     app.post('/api/login', async (req, res) => {
         const { email, password } = req.body;
         try {
             const user = await User.findOne({ email });
             if (!user) {
                 return res.status(400).json({ message: 'Invalid email or password' });
             }
             const isMatch = await bcrypt.compare(password, user.password);
             if (!isMatch) {
                 return res.status(400).json({ message: 'Invalid email or password' });
             }
             const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
                 expiresIn: '1d',
             });
             console.log(`User logged in: ${email}`);
             res.json({ token });
         } catch (error) {
             console.error('Error in /login:', error.message, error.stack);
             res.status(500).json({ message: 'Server error', error: error.message });
         }
     });

     // Chat route
     app.post('/api/chat', auth, async (req, res) => {
         const { prompt, chatId } = req.body;
         try {
             if (!prompt) {
                 return res.status(400).json({ message: 'Prompt is required' });
             }
             let chat;
             let title = '';
             if (chatId) {
                 console.log(`Fetching chat ${chatId} for user ${req.user.userId}`);
                 chat = await Chat.findOne({ _id: chatId, userId: req.user.userId });
                 if (!chat) {
                     return res.status(404).json({ message: 'Chat not found' });
                 }
             } else {
                 console.log(`Creating new chat for user ${req.user.userId}`);
                 // Generate title using OpenAI
                 try {
                     const titleResponse = await openai.chat.completions.create({
                         model: 'gpt-3.5-turbo',
                         messages: [
                             {
                                 role: 'system',
                                 content: 'Generate a concise chat title (5-10 words) summarizing the user\'s prompt for a LeetCode AI helper. Focus on the main topic or question.',
                             },
                             {
                                 role: 'user',
                                 content: prompt,
                             },
                         ],
                         max_tokens: 20,
                     });
                     title = titleResponse.choices[0].message.content.trim();
                     console.log(`Generated title: ${title}`);
                 } catch (titleError) {
                     console.error('Error generating title:', titleError.message);
                     // Fallback: Extract key words from prompt
                     const words = prompt.split(/\s+/).filter(word =>
                         !['explain', 'provide', 'can', 'you', 'the', 'a', 'an', 'in', 'to'].includes(word.toLowerCase())
                     );
                     title = words.slice(0, 3).join(' ').substring(0, 50) || 'New Chat';
                 }
                 chat = new Chat({
                     userId: req.user.userId,
                     title,
                     messages: [],
                 });
             }
             // Add user message
             chat.messages.push({ role: 'user', content: prompt });
             // Prepare messages for OpenAI
             const messages = [
                 {
                     role: 'system',
                     content: 'Act as a simple ChatGPT imitation for LeetCode help. Provide logic, intuition, and pseudocode for LeetCode problems, but do not include code snippets unless explicitly requested. If asked for code, provide it, and offer optimized versions if requested.',
                 },
                 ...chat.messages.map(msg => ({
                     role: msg.role === 'ai' ? 'assistant' : msg.role,
                     content: msg.content
                 }))
             ];
             console.log('Messages sent to OpenAI:', JSON.stringify(messages, null, 2));
             // Call OpenAI
             const response = await openai.chat.completions.create({
                 model: 'gpt-3.5-turbo',
                 messages,
                 max_tokens: 1000,
             });
             const aiResponse = response.choices[0].message.content.trim();
             console.log('OpenAI Response:', aiResponse);
             // Add AI response
             chat.messages.push({ role: 'ai', content: aiResponse });
             // Save chat
             await chat.save();
             console.log(`Chat ${chat._id} saved with ${chat.messages.length} messages`);
             res.json({ response: aiResponse, chatId: chat._id });
         } catch (error) {
             console.error('Error in /chat:', error.message, error.stack);
             if (error.response) {
                 console.error('OpenAI API Error:', error.response.data);
             }
             res.status(500).json({ message: 'Error communicating with AI', error: error.message });
         }
     });

     // Get chat history
     app.get('/api/chats', auth, async (req, res) => {
         try {
             const chats = await Chat.find({ userId: req.user.userId }).sort({ createdAt: -1 });
             console.log(`Fetched ${chats.length} chats for user ${req.user.userId}`);
             res.json(chats);
         } catch (error) {
             console.error('Error fetching chats:', error.message, error.stack);
             res.status(500).json({ message: 'Error fetching chats', error: error.message });
         }
     });

     // Get specific chat
     app.get('/api/chats/:chatId', auth, async (req, res) => {
         try {
             const chat = await Chat.findOne({ _id: req.params.chatId, userId: req.user.userId });
             if (!chat) {
                 return res.status(404).json({ message: 'Chat not found' });
             }
             console.log(`Fetched chat ${req.params.chatId} for user ${req.user.userId}`);
             res.json(chat);
         } catch (error) {
             console.error('Error fetching chat:', error.message, error.stack);
             res.status(500).json({ message: 'Error fetching chat', error: error.message });
         }
     });

     // Delete all chats
     app.delete('/api/chats', auth, async (req, res) => {
         try {
             await Chat.deleteMany({ userId: req.user.userId });
             console.log(`Deleted all chats for user ${req.user.userId}`);
             res.json({ message: 'All chats deleted' });
         } catch (error) {
             console.error('Error deleting chats:', error.message, error.stack);
             res.status(500).json({ message: 'Error deleting chats', error: error.message });
         }
     });

     // Delete individual chat
     app.delete('/api/chats/:chatId', auth, async (req, res) => {
         try {
             const chat = await Chat.findOneAndDelete({ _id: req.params.chatId, userId: req.user.userId });
             if (!chat) {
                 return res.status(404).json({ message: 'Chat not found' });
             }
             console.log(`Deleted chat ${req.params.chatId} for user ${req.user.userId}`);
             res.json({ message: 'Chat deleted' });
         } catch (error) {
             console.error('Error deleting chat:', error.message, error.stack);
             res.status(500).json({ message: 'Error deleting chat', error: error.message });
         }
     });

     // Export the app for Vercel
     module.exports = app;