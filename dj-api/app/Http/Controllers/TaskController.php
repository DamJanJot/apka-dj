<?php
namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TodoList;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index()
    {
        return Task::with('list')
            ->where('user_id', auth()->id())
            ->orderBy('ordering')
            ->get();
    }

    public function store(Request $r)
    {
        $data = $r->validate([
            'list_id' => 'required|integer',
            'name' => 'required|string|max:255',
            'remind_date' => 'nullable|date',
        ]);
        $data['user_id'] = auth()->id();
        $data['completed'] = false;
        $data['ordering'] = $r->integer('ordering') ?? 0;

        return Task::create($data);
    }

    public function toggle(Task $task)
    {
        abort_unless($task->user_id === auth()->id(), 403);
        $task->completed = ! $task->completed;
        $task->save();
        return $task->refresh()->load('list');
    }

    public function destroy(Task $task)
    {
        abort_unless($task->user_id === auth()->id(), 403);
        $task->delete();
        return response()->noContent();
    }
}
