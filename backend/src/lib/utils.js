import jwt from 'jsonwebtoken';
export const generateToken =(userId,res) =>
{
    const token= jwt.sign({userId},process.env.JWT_SECRET,{expiresIn: "7d"});
    res.cookie("jwt",token, { maxAge: 7*24*60*60*1000, httpOnly: true,//cant be accessed by javascript, document.token doesn't work! 
        sameSite: "strict",//"strict",cookie only sent for same site, if hacker try to access from a diff site then cant access
         secure: process.env.NODE_ENV === "production"? true:false,})// secure:true means cookie works only over https, false: both http and https  

     return token;   
}
