<?php

namespace App\Http\Controllers;

use App\Models\OptivioProject;
use App\Models\OptivioTask;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OptivioController extends Controller
{
    public function projects(Request $request)
    {
        $me = (int) $request->user()->id;

        $projects = OptivioProject::query()
            ->where('user_id', $me)
            ->with([
                'tasks' => function ($query) {
                    $query->orderByDesc('created_at');
                }
            ])
            ->orderByDesc('created_at')
            ->get();

        return response()->json($projects->map(fn(OptivioProject $project) => $this->serializeProject($project)));
    }

    public function createProject(Request $request)
    {
        $me = (int) $request->user()->id;

        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'description' => ['nullable', 'string', 'max:5000'],
            'due_date' => ['nullable', 'date'],
        ]);

        $project = OptivioProject::query()->create([
            'user_id' => $me,
            'name' => trim((string) $data['name']),
            'description' => trim((string) ($data['description'] ?? '')),
            'due_date' => $data['due_date'] ?? null,
            'taskora_project_id' => null,
        ]);

        $project->setRelation('tasks', collect());

        return response()->json($this->serializeProject($project), 201);
    }

    public function linkTaskoraProject(Request $request, int $projectId)
    {
        $me = (int) $request->user()->id;

        $project = OptivioProject::query()
            ->where('id', $projectId)
            ->where('user_id', $me)
            ->firstOrFail();

        $data = $request->validate([
            'taskora_project_id' => ['required', 'integer', 'min:1'],
        ]);

        $project->taskora_project_id = (int) $data['taskora_project_id'];
        $project->save();

        if (!$project->relationLoaded('tasks')) {
            $project->setRelation('tasks', OptivioTask::query()->where('project_id', (int) $project->id)->orderByDesc('created_at')->get());
        }

        return response()->json($this->serializeProject($project));
    }

    public function createTask(Request $request, int $projectId)
    {
        $me = (int) $request->user()->id;

        $project = OptivioProject::query()
            ->where('id', $projectId)
            ->where('user_id', $me)
            ->firstOrFail();

        $data = $request->validate([
            'title' => ['required', 'string', 'min:2', 'max:190'],
            'description' => ['nullable', 'string', 'max:10000'],
            'due_date' => ['nullable', 'date'],
            'status' => ['nullable', 'in:ready,progress,review,done'],
        ]);

        $task = OptivioTask::query()->create([
            'project_id' => (int) $project->id,
            'user_id' => $me,
            'title' => trim((string) $data['title']),
            'description' => trim((string) ($data['description'] ?? '')),
            'due_date' => $data['due_date'] ?? null,
            'status' => (string) ($data['status'] ?? 'ready'),
            'taskora_synced' => false,
        ]);

        return response()->json($this->serializeTask($task), 201);
    }

    public function updateTaskStatus(Request $request, int $projectId, int $taskId)
    {
        $me = (int) $request->user()->id;

        $task = OptivioTask::query()
            ->where('id', $taskId)
            ->where('project_id', $projectId)
            ->where('user_id', $me)
            ->firstOrFail();

        $data = $request->validate([
            'status' => ['required', 'in:ready,progress,review,done'],
        ]);

        $task->status = (string) $data['status'];
        $task->save();

        return response()->json($this->serializeTask($task));
    }

    public function updateTaskoraSync(Request $request, int $projectId, int $taskId)
    {
        $me = (int) $request->user()->id;

        $task = OptivioTask::query()
            ->where('id', $taskId)
            ->where('project_id', $projectId)
            ->where('user_id', $me)
            ->firstOrFail();

        $data = $request->validate([
            'synced' => ['required', 'boolean'],
            'task_id' => ['nullable', 'string', 'max:100'],
            'error' => ['nullable', 'string', 'max:500'],
        ]);

        $task->taskora_synced = (bool) $data['synced'];
        $task->taskora_task_id = $task->taskora_synced ? (string) ($data['task_id'] ?? '') : null;
        $task->taskora_error = $task->taskora_synced ? null : trim((string) ($data['error'] ?? ''));
        $task->taskora_last_attempt_at = now();
        $task->save();

        return response()->json($this->serializeTask($task));
    }

    public function overview(Request $request)
    {
        $me = (int) $request->user()->id;

        $projectsCount = OptivioProject::query()->where('user_id', $me)->count();
        $tasksCount = OptivioTask::query()->where('user_id', $me)->count();
        $doneTasksCount = OptivioTask::query()->where('user_id', $me)->where('status', 'done')->count();
        $syncPendingCount = OptivioTask::query()->where('user_id', $me)->where('taskora_synced', false)->count();

        $projectDeadlines = OptivioProject::query()
            ->where('user_id', $me)
            ->whereNotNull('due_date')
            ->select(['id', 'name', 'due_date'])
            ->get()
            ->map(function ($project) {
                return [
                    'id' => 'project-' . (int) $project->id,
                    'date' => (string) $project->due_date,
                    'title' => 'Projekt: ' . (string) $project->name,
                    'type' => 'project',
                    'projectName' => (string) $project->name,
                ];
            });

        $taskDeadlines = DB::table('optivio_tasks as t')
            ->join('optivio_projects as p', 'p.id', '=', 't.project_id')
            ->where('t.user_id', $me)
            ->whereNotNull('t.due_date')
            ->select([
                't.id',
                't.title',
                't.due_date',
                't.status',
                'p.name as project_name',
            ])
            ->get()
            ->map(function ($task) {
                return [
                    'id' => 'task-' . (int) $task->id,
                    'date' => (string) $task->due_date,
                    'title' => (string) $task->title,
                    'type' => 'task',
                    'projectName' => (string) $task->project_name,
                    'status' => (string) $task->status,
                ];
            });

        $deadlines = $projectDeadlines
            ->concat($taskDeadlines)
            ->sortBy('date')
            ->values();

        return response()->json([
            'projectsCount' => $projectsCount,
            'tasksCount' => $tasksCount,
            'doneTasksCount' => $doneTasksCount,
            'syncPendingCount' => $syncPendingCount,
            'deadlines' => $deadlines,
        ]);
    }

    private function serializeProject(OptivioProject $project): array
    {
        return [
            'id' => (int) $project->id,
            'name' => (string) $project->name,
            'description' => (string) ($project->description ?? ''),
            'due_date' => $project->due_date ? (string) $project->due_date : null,
            'taskora_project_id' => $project->taskora_project_id ? (int) $project->taskora_project_id : null,
            'created_at' => optional($project->created_at)->toISOString(),
            'tasks' => collect($project->tasks ?? [])->map(fn(OptivioTask $task) => $this->serializeTask($task))->values(),
        ];
    }

    private function serializeTask(OptivioTask $task): array
    {
        return [
            'id' => (int) $task->id,
            'project_id' => (int) $task->project_id,
            'title' => (string) $task->title,
            'description' => (string) ($task->description ?? ''),
            'due_date' => $task->due_date ? (string) $task->due_date : null,
            'status' => (string) $task->status,
            'created_at' => optional($task->created_at)->toISOString(),
            'taskora_sync' => [
                'synced' => (bool) $task->taskora_synced,
                'task_id' => $task->taskora_task_id,
                'last_attempt_at' => optional($task->taskora_last_attempt_at)->toISOString(),
                'error' => $task->taskora_error,
            ],
        ];
    }
}
