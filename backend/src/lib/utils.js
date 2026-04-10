import jwt from 'jsonwebtoken';
import { ENV } from './env.js';
export const generateToken =(userId,res) =>
{
    const {NODE_ENV, JWT_SECRET} = ENV;
    if(!JWT_SECRET)
    {
        throw new Error("Jwt secret is not found!");
    }
    if(!NODE_ENV)
    {
        throw new Error("Node env is not mentioned!")
    }
    const token= jwt.sign({userId},JWT_SECRET,{expiresIn: "7d"});
    res.cookie("jwt", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: NODE_ENV === "production" ? "lax" : "strict",
        secure: NODE_ENV === "production",
    });

     return token;   
}
