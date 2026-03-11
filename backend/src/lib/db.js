import mongoose from "mongoose";
import { ENV } from "./env.js";
export const connectDB = async () => {
    try{
        const con=await mongoose.connect(ENV.MONGO_URI)
        console.log('MongoDB connected:',con.connection.host);
    }
    catch(error)
    {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);//1 status code indicates failure
    }
}