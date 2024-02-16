import { Inter } from 'next/font/google'
import './globals.css'
import classNames from 'classnames'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Foodvisor',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={classNames(inter.className, 'bg-white')}>
        <header className="bg-blue-600 text-white text-center py-10 text-2xl font-bold">
          Paris Foodvisor
        </header>
        {children}
      </body>
    </html>
  )
}
