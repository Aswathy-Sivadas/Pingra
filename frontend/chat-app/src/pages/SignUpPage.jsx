import React, { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore';
import BorderAnimatedContainer from '../components/BorderAnimatedContainer';
import { MessageCircle as MessageCircleIcon, Lock as LockIcon, Mail as MailIcon, User as UserIcon, Loader as LoaderIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

function SignUpPage() {
  const [formData, setFormData] = useState({fullName: "", email:"", password:""});
  const {signup,isSigningUp} = useAuthStore();
  const handleSubmit = (e) =>{
    e.preventDefault();
    signup(formData);
  }
  return(
     <div className="w-full flex items-center justify-center p-4 bg-slate-900">
      <div className="relative w-full max-w-6xl md:h-[800px] h-[650px]">
        <BorderAnimatedContainer>
          <div className="w-full flex flex-col md:flex-row">
            {/* FORM CLOUMN - LEFT SIDE */}
            <div className="md:w-1/2 p-8 flex items-center justify-center md:border-r border-slate-600/30">
              <div className="w-full max-w-md">
                {/* HEADING TEXT */}
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <MessageCircleIcon className="w-10 h-10 text-cyan-400" />
                    <span className="text-3xl font-extrabold text-cyan-400 tracking-wide">Pingra</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-200 mb-2">Create Account</h2>
                  <p className="text-slate-400">Join Pingra — it's free</p>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* FULL NAME */}
                  <div>
                    <label className="auth-input-label">Full Name</label>
                    <div className="relative">
                      <UserIcon className="auth-input-icon" />

                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="input"
                        placeholder="Aswathy Das"
                      />
                    </div>
                  </div>
                  {/* EMAIL INPUT */}
                  <div>
                    <label className="auth-input-label">Email</label>
                    <div className="relative">
                      <MailIcon className="auth-input-icon" />

                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="input"
                        placeholder="aswathydas612@gmail.com"
                      />
                    </div>
                  </div>
                  {/* PASSWORD INPUT */}
                  <div>
                    <label className="auth-input-label">Password</label>
                    <div className="relative">
                      <LockIcon className="auth-input-icon" />

                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="input"
                        placeholder="*******"
                      />
                    </div>
                  </div>
                  {/* SUBMIT BUTTON */}
                  <button className="auth-btn" type="submit" disabled={isSigningUp}>
                    {isSigningUp?(<LoaderIcon className="w-full h-5 animate-spin text-center"/>):("Create Account")}
                  </button>
                
                </form>
                <div className="mt-6 text-center">
                  <Link to="/login" className="auth-link">Already have an account?
                  </Link>
                </div>
              </div>
              </div>

           {/* FORM-ILLUSTRATION- RIGHT SIDE  */}
           <div className="hidden md:w-1/2 md:flex items-center justify-center p-6 bg-gradient-to-bl from-slate-800/20 to-transparent">
              <div>
                <img
                  src="/signup.png"
                  alt="People using mobile devices"
                  className="w-full h-auto object-contain"
                />
                <div className="mt-6 text-center">
                  <h3 className="text-2xl font-bold text-cyan-400">Pingra</h3>
                  <p className="text-slate-400 mt-1 text-sm">Start your journey today</p>

                  <div className="mt-4 flex justify-center gap-4">
                    <span className="auth-badge">Free</span>
                    <span className="auth-badge">Easy Setup</span>
                    <span className="auth-badge">Private</span>
                  </div>
                </div>
              </div>
              </div>
        </div>
      </BorderAnimatedContainer>
      </div>
    </div>
  )
}

export default SignUpPage
