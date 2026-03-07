import SunClockWidget from '../components/sun-clock-widget'
import WeatherWidget from '@/components/weather_widget';
import WeatherForecast from '@/components/weather-forecast';

const weatherApiKey = import.meta.env.VITE_WEATHER_API_KEY ?? ''


export default function Dashboard(){
  return (
    <div className="content">
      <div className='card'>
        <div className='grid'>
          <SunClockWidget />
          <WeatherWidget city="Warszawa" apiKey={weatherApiKey} />
        </div> 
        <WeatherForecast city="Warszawa" apiKey={weatherApiKey} />       
      </div>             
    </div>
  )
}
