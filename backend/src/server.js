import express from 'express';
import {ENV} from './lib/env.js';
import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';    
const app = express();
import path from 'path';
import { connectDB } from './lib/db.js'
app.use(express.json());
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