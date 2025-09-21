import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface WeatherWidgetProps {
  city: string;
  apiKey: string;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ city, apiKey }) => {
  const [temperature, setTemperature] = useState<number | null>(null);
  const [clouds, setClouds] = useState<number | null>(null);
  const [icon, setIcon] = useState<string | null>(null);

  useEffect(() => {
    axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`)
      .then(res => {
        console.log('Dane z API:', res.data);  // Dodane logowanie do sprawdzenia co przychodzi

        setTemperature(Math.round(res.data.main.temp));
        setClouds(res.data.clouds?.all ?? 0); // Jeśli clouds.all nie istnieje, da 0
        setIcon(res.data.weather?.[0]?.icon);
      })
      .catch(err => console.error('Błąd pobierania pogody:', err));
  }, [city, apiKey]);

  return (
    <div className="bg-neutral-900 text-white rounded-xl p-4 w-48 flex flex-col items-center shadow-xl">
      <h2 className="text-lg font-medium mb-4">{city}</h2>
      <div className="flex items-center justify-between w-full mb-4">
        <span className="text-3xl">{temperature !== null ? `${temperature}` : '--'}&#176;C</span>
        <div className="flex items-center ml-2">
          <span>&#9729; {clouds !== null ? `${clouds}%` : '--'}</span>
        </div>
      </div>

    </div>
  );
};

export default WeatherWidget;
