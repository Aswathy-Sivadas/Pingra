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
    res.cookie("jwt",token, { maxAge: 7*24*60*60*1000, httpOnly: true,//cant be accessed by javascript, document.token doesn't work! 
        sameSite: "strict",//"strict",cookie only sent for same site, if hacker try to access from a diff site then cant access
         secure: NODE_ENV === "production"? true:false,})// secure:true means cookie works only over https, false: both http and https  

     return token;   
}
