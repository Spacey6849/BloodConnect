import { redirect } from 'next/navigation'

export default function Home() {
  // Always send users hitting the root to the login page
  redirect('/login')
}
