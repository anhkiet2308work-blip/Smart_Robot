import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Home() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to robot mode by default
    router.push('/robot')
  }, [router])

  return (
    <>
      <Head>
        <title>Smart Robot Dashboard</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-xl font-bold">Đang chuyển hướng...</p>
        </div>
      </div>
    </>
  )
}
