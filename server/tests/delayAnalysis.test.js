const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { resolveDeliveryDates } = require('../src/services/deliveryDateService');
const { analyzeProjectDelay } = require('../src/services/projectDelayAnalysisService');
const { toClientTask } = require('../src/dto/clientTaskDto');
const { toClientDelayAnalysis } = require('../src/dto/clientProjectDto');

describe('deliveryDateService', () => {
  it('prefers target, then revised, then original', () => {
    const dates = resolveDeliveryDates(
      {
        originalDeliveryDate: '2026-08-01',
        revisedDeliveryDate: '2026-08-14',
        targetDeliveryDate: '2026-08-20',
      },
      ['2026-07-25']
    );
    assert.equal(dates.activeDeliveryDate, '2026-08-20');
  });

  it('falls back to latest task due date', () => {
    const dates = resolveDeliveryDates({}, ['2026-08-05', '2026-08-10']);
    assert.equal(dates.activeDeliveryDate, '2026-08-10');
  });
});

describe('projectDelayAnalysisService', () => {
  const now = new Date(2026, 7, 21);

  const tasks = [
    {
      id: 1,
      taskId: 'T-1',
      taskName: 'OAuth Integration',
      status: 'In Development',
      dueDate: '2026-08-15',
      module: 'Authentication',
      phase: 'Development',
      recordType: 'task',
      progressPercent: 35,
    },
    {
      id: 2,
      taskId: 'T-2',
      taskName: 'Payment Gateway',
      status: 'Testing',
      dueDate: '2026-08-17',
      module: 'Payments',
      phase: 'Development',
      recordType: 'task',
      progressPercent: 60,
    },
    {
      id: 3,
      taskId: 'T-3',
      taskName: 'Done item',
      status: 'Completed',
      dueDate: '2026-08-01',
      recordType: 'task',
      progressPercent: 100,
    },
  ];

  it('marks overdue project and picks primary delay driver', () => {
    const analysis = analyzeProjectDelay(
      { originalDeliveryDate: '2026-08-14' },
      tasks,
      now
    );
    assert.equal(analysis.deliveryStatus, 'OVERDUE');
    assert.ok(analysis.daysOverdue > 0);
    assert.ok(analysis.primaryDelayDriver);
    assert.equal(analysis.primaryDelayDriver.taskName, 'OAuth Integration');
  });

  it('returns completed status when all tasks done', () => {
    const doneTasks = tasks.map((t) => ({ ...t, status: 'Completed', progressPercent: 100 }));
    const analysis = analyzeProjectDelay({ originalDeliveryDate: '2026-08-14' }, doneTasks, now);
    assert.equal(analysis.deliveryStatus, 'COMPLETED');
  });
});

describe('client DTO sanitization', () => {
  it('strips internal task fields', () => {
    const clientTask = toClientTask({
      id: 9,
      taskId: 'T-9',
      taskName: 'Secret task',
      developerId: 3,
      remarks: 'internal block reason',
      estimatedHours: 12,
      actualHours: 4,
      status: 'Blocked',
      dueDate: '2026-08-10',
      recordType: 'task',
    });

    assert.equal(clientTask.developerId, undefined);
    assert.equal(clientTask.remarks, undefined);
    assert.equal(clientTask.estimatedHours, undefined);
    assert.match(clientTask.publicStatusNote, /blocked/i);
    assert.equal(clientTask.taskName, 'Secret task');
  });

  it('does not expose delay impact scores to clients', () => {
    const analysis = analyzeProjectDelay(
      { originalDeliveryDate: '2026-08-14' },
      [
        {
          id: 1,
          taskId: 'T-1',
          taskName: 'OAuth Integration',
          status: 'In Development',
          dueDate: '2026-08-15',
          recordType: 'task',
          progressPercent: 35,
        },
      ],
      new Date(2026, 7, 21)
    );
    const clientView = toClientDelayAnalysis(analysis);
    assert.equal(clientView.primaryDelayedWork?.delayImpactScore, undefined);
    assert.equal(JSON.stringify(clientView).includes('delayImpactScore'), false);
  });
});
