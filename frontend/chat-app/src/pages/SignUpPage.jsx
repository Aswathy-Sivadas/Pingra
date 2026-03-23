import React from 'react'

function SignUpPage() {
  const {authUser,isLoading, isLoggedIn, login}= useAuthStore()
    console.log("authuser", authUser);
    console.log("isLoading", isLoading);
    console.log("isLoggedIn", isLoggedIn);
  return (
    <div>
      <h1>Signuppage</h1>
    </div>
  )
}

export default SignUpPage
