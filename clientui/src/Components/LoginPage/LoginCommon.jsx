import React from 'react'
import { Outlet } from 'react-router-dom'
const LoginCommon = () => {
  return (
    <>
    <div>
      {/* Login wrapper - routes rendered below */}
    </div>
    <div>
      <Outlet/>
    </div>
    </>
  )
}

export default LoginCommon
