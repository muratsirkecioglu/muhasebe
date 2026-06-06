import Dashboard from './Dashboard'
import Projeksiyon from './Projeksiyon'

export default function DashboardProj() {
  return (
    <div>
      <Dashboard />
      <div className="border-t border-slate-100 mx-4 md:mx-6" />
      <Projeksiyon />
    </div>
  )
}
