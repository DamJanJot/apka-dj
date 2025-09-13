<?php
namespace App\Http\Controllers;

use App\Models\Note;
use Illuminate\Http\Request;

class NoteController extends Controller
{


public function thread(int $userId)
{
    $me = auth()->id();
    return Message::where(function($q) use ($me,$userId){
            $q->where('nadawca_id',$me)->where('odbiorca_id',$userId);
        })->orWhere(function($q) use ($me,$userId){
            $q->where('nadawca_id',$userId)->where('odbiorca_id',$me);
        })
        ->orderBy('data_wyslania')
        ->get();
}

public function send(Request $r)
{
    $data = $r->validate([
        'to' => 'required|integer',
        'tresc' => 'required|string|max:5000',
    ]);
    return Message::create([
        'nadawca_id' => auth()->id(),
        'odbiorca_id' => $data['to'],
        'tresc' => $data['tresc'],
        'przeczytana' => 0,
    ]);
}
public function markRead(int $messageId)
{
    $me = auth()->id();
    $msg = Message::where('id',$messageId)->where('odbiorca_id',$me)->firstOrFail();
    $msg->przeczytana = true;
    $msg->save();
    return $msg;
}
public function destroy(int $messageId)
{
    $me = auth()->id();
    $msg = Message::where('id',$messageId)
        ->where(function($q) use ($me){
            $q->where('nadawca_id',$me)->orWhere('odbiorca_id',$me);
        })->firstOrFail();
    $msg->delete();
    return response()->noContent();
}
}

