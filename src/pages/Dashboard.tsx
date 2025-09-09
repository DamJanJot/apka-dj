import SunClockWidget from '../components/sun-clock-widget'
import WeatherWidget from '@/components/weather_widget';
import WeatherForecast from '@/components/weather-forecast';



export default function Dashboard(){
  return (
    <div className="content">
      <div className='card'>
        <div className='grid'>
          <SunClockWidget />
          <WeatherWidget city="Warszawa" apiKey="af8b3311443695ee4563e7d85bec9253" />
        </div> 
        <WeatherForecast city="Warszawa" apiKey="af8b3311443695ee4563e7d85bec9253" />       
      </div>             
    </div>
  )
}
