<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class LegacyUser extends Authenticatable
{
    use Notifiable, HasApiTokens;

    protected $table = 'uzytkownicy';
    public $timestamps = false;

    protected $fillable = [
        'imie', 'nazwisko', 'email', 'haslo', 'zdjecie_profilowe', 'nick', 'opis', 'rola'
    ];

    protected $hidden = ['haslo'];

    public function getAuthPassword()
    {
        // Laravel będzie porównywał hasło z kolumną `haslo` (bcrypt)
        return $this->haslo;
    }

    public function getNameAttribute(): string
    {
        return trim(($this->imie ?? '').' '.($this->nazwisko ?? '')) ?: ($this->nick ?? 'Użytkownik');
    }

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->zdjecie_profilowe ?: null;
    }
}
