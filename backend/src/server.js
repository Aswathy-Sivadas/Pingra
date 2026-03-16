import express from 'express';
import {ENV} from './lib/env.js';

// Prevent arcjet HTTP2 connection errors from crashing the server
process.on('uncaughtException', (err) => {
    if (err.code === 'ERR_HTTP2_ERROR') return;
    console.error('Uncaught Exception:', err);
    process.exit(1);
});
import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';  
import cookieParser from 'cookie-parser';  
import { protectRoute } from './middleware/auth.middleware.js';
const app = express();
import path from 'path';
import { connectDB } from './lib/db.js'
app.use(express.json());
app.use(cookieParser());
const PORT = ENV.PORT || 3000;
const __dirname =  path.resolve();
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

if(ENV.NODE_ENV==="production")
{
    app.use(express.static(path.join(__dirname,"../frontend/chat-app/dist")));
    app.get("*",(req,res)=>{
        res.sendFile(path.join(__dirname,"../frontend/chat-app/dist/index.html"))
    })
}


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDB();
});