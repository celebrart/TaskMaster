document.addEventListener('DOMContentLoaded', () => {
    // === ESTADO E ESTRUTURAS DE DADOS ===
    let tasks = JSON.parse(localStorage.getItem('taskMasterData')) || [];
    let currentDragSource = null;
    let currentDateObj = new Date();

    // === CACHE DE ELEMENTOS DO DOM ===
    const views = document.querySelectorAll('.view');
    const navBtns = document.querySelectorAll('.nav-btn');
    const themeToggle = document.getElementById('themeToggle');
    const modal = document.getElementById('taskModal');
    const taskForm = document.getElementById('taskForm');
    const tasksContainer = document.getElementById('tasksContainer');
    const toastContainer = document.getElementById('toastContainer');
    const searchInput = document.getElementById('searchInput');
    const filterSelect = document.getElementById('filterSelect');
    const sortSelect = document.getElementById('sortSelect');

    // === INICIALIZAÇÃO ===
    init();

    function init() {
        applyTheme();
        updateDisplay();
        setupEventListeners();
        checkUpcomingDeadlines();
    }

    // === GERENCIAMENTO DE INTERFACE (SPA & TEMA) ===
    function setupEventListeners() {
        // Navegação
        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                navBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const targetView = e.target.getAttribute('data-target');
                views.forEach(v => {
                    v.classList.remove('active');
                    if (v.id === targetView) v.classList.add('active');
                });
                if(targetView === 'calendar') renderCalendar();
            });
        });

        // Modal
        document.getElementById('btnNewTask').addEventListener('click', () => openModal());
        document.getElementById('closeModal').addEventListener('click', closeModal);
        document.getElementById('cancelModal').addEventListener('click', closeModal);
        
        // Formulário
        taskForm.addEventListener('submit', handleTaskSubmit);

        // Controles de Tarefas
        searchInput.addEventListener('input', () => renderTasks());
        filterSelect.addEventListener('change', () => renderTasks());
        sortSelect.addEventListener('change', () => renderTasks());
        
        // Ações em massa
        document.getElementById('btnMarkAll').addEventListener('click', () => {
            tasks.forEach(t => t.completed = true);
            saveAndRender("Todas as tarefas concluídas!");
        });
        document.getElementById('btnClearAll').addEventListener('click', () => {
            if(confirm('Tem certeza que deseja excluir TODAS as tarefas?')) {
                tasks = [];
                saveAndRender("Todas as tarefas foram excluídas.");
            }
        });

        // Exportações
        document.getElementById('btnExportCSV').addEventListener('click', exportCSV);
        document.getElementById('btnExportPDF').addEventListener('click', () => window.print());

        // Tema
        if(themeToggle) {
            themeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const isDark = document.body.classList.contains('dark-mode');
                localStorage.setItem('taskMasterTheme', isDark ? 'dark' : 'light');
            });
        }

        // Calendário Controles
        document.getElementById('prevMonth').addEventListener('click', () => {
            currentDateObj.setMonth(currentDateObj.getMonth() - 1);
            renderCalendar();
        });
        document.getElementById('nextMonth').addEventListener('click', () => {
            currentDateObj.setMonth(currentDateObj.getMonth() + 1);
            renderCalendar();
        });

        // Atalhos de teclado
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && document.activeElement !== searchInput && !modal.classList.contains('active')) {
                e.preventDefault();
                searchInput.focus();
            }
        });
    }

    function applyTheme() {
        if (localStorage.getItem('taskMasterTheme') === 'dark') {
            document.body.classList.add('dark-mode');
        }
    }

    // === LÓGICA CORE (CRUD) ===
    function handleTaskSubmit(e) {
        e.preventDefault();
        
        const id = document.getElementById('taskId').value;
        const newTask = {
            id: id ? id : Date.now().toString(),
            title: document.getElementById('taskTitle').value,
            category: document.getElementById('taskCategory').value || 'Geral',
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDate').value,
            dueTime: document.getElementById('taskTime').value || '23:59',
            desc: document.getElementById('taskDesc').value,
            completed: id ? tasks.find(t => t.id === id).completed : false,
            createdAt: id ? tasks.find(t => t.id === id).createdAt : new Date().toISOString()
        };

        if (id) {
            tasks = tasks.map(t => t.id === id ? newTask : t);
            showToast('Tarefa atualizada com sucesso!');
        } else {
            tasks.push(newTask);
            showToast('Nova tarefa criada!');
        }

        closeModal();
        saveAndRender();
    }

    window.deleteTask = function(id) {
        if(confirm('Deseja excluir esta tarefa?')) {
            tasks = tasks.filter(t => t.id !== id);
            saveAndRender("Tarefa excluída.");
        }
    }

    window.editTask = function(id) {
        const task = tasks.find(t => t.id === id);
        if(!task) return;
        
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskCategory').value = task.category;
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskDate').value = task.dueDate;
        document.getElementById('taskTime').value = task.dueTime;
        document.getElementById('taskDesc').value = task.desc;
        
        document.getElementById('modalTitle').innerText = 'Editar Tarefa';
        openModal();
    }

    window.toggleComplete = function(id) {
        const task = tasks.find(t => t.id === id);
        task.completed = !task.completed;
        saveAndRender(task.completed ? "Tarefa concluída!" : "Status revertido.");
    }

    // === LÓGICA DE STATUS E PRAZOS ===
    function getTaskStatus(task) {
        if (task.completed) return 'completed';
        
        const now = new Date();
        const due = new Date(`${task.dueDate}T${task.dueTime}`);
        const diffHours = (due - now) / (1000 * 60 * 60);

        if (diffHours < 0) return 'overdue';
        if (diffHours <= 24) return 'warning';
        return 'ontime';
    }

    function checkUpcomingDeadlines() {
        tasks.forEach(task => {
            if (!task.completed) {
                const status = getTaskStatus(task);
                if (status === 'warning') showToast(`Aviso: "${task.title}" vence em menos de 24h.`);
                if (status === 'overdue') showToast(`Atenção: "${task.title}" está vencida!`);
            }
        });
    }

    // === RENDERIZAÇÃO ===
    function saveAndRender(msg = "") {
        localStorage.setItem('taskMasterData', JSON.stringify(tasks));
        if (msg) showToast(msg);
        updateDisplay();
    }

    function updateDisplay() {
        renderDashboard();
        renderTasks();
        if (document.getElementById('calendar').classList.contains('active')) {
            renderCalendar();
        }
    }

    function renderDashboard() {
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const pending = total - completed;
        
        let overdue = 0;
        let today = 0;
        const todayStr = new Date().toISOString().split('T')[0];

        tasks.forEach(t => {
            if(!t.completed && getTaskStatus(t) === 'overdue') overdue++;
            if(t.dueDate === todayStr) today++;
        });

        document.getElementById('statTotal').innerText = total;
        document.getElementById('statCompleted').innerText = completed;
        document.getElementById('statPending').innerText = pending;
        document.getElementById('statOverdue').innerText = overdue;
        document.getElementById('statToday').innerText = today;

        const perc = total === 0 ? 0 : Math.round((completed / total) * 100);
        document.getElementById('generalProgress').style.width = `${perc}%`;
        document.getElementById('progressText').innerText = `${perc}% concluído`;
        
        document.getElementById('currentDateDisplay').innerText = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    function renderTasks() {
        tasksContainer.innerHTML = '';
        const filter = filterSelect.value;
        const sort = sortSelect.value;
        const query = searchInput.value.toLowerCase();
        const todayStr = new Date().toISOString().split('T')[0];

        // Filtragem
        let filtered = tasks.filter(task => {
            if (query && !task.title.toLowerCase().includes(query) && !task.desc.toLowerCase().includes(query)) return false;
            
            if (filter === 'today') return task.dueDate === todayStr;
            if (filter === 'pending') return !task.completed;
            if (filter === 'completed') return task.completed;
            if (filter === 'overdue') return !task.completed && getTaskStatus(task) === 'overdue';
            if (filter === 'high') return task.priority === 'Alta' || task.priority === 'Urgente';
            
            return true;
        });

        // Ordenação
        filtered.sort((a, b) => {
            if (sort === 'date-asc') return new Date(a.dueDate) - new Date(b.dueDate);
            if (sort === 'date-desc') return new Date(b.dueDate) - new Date(a.dueDate);
            if (sort === 'created-desc') return new Date(b.createdAt) - new Date(a.createdAt);
            if (sort === 'priority') {
                const p = { 'Urgente': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };
                return p[b.priority] - p[a.priority];
            }
            return 0;
        });

        // Construção do DOM (Drag and Drop habilitado)
        filtered.forEach(task => {
            const statusClass = `status-${getTaskStatus(task)}`;
            const card = document.createElement('div');
            card.className = `task-card ${statusClass}`;
            card.setAttribute('draggable', 'true');
            card.dataset.id = task.id;

            card.innerHTML = `
                <div class="task-header">
                    <span class="task-title">${task.title}</span>
                    <span class="task-badge">${task.priority}</span>
                </div>
                <div class="task-desc">${task.desc || 'Sem descrição'}</div>
                <div class="task-footer">
                    <span>📅 ${task.dueDate.split('-').reverse().join('/')} às ${task.dueTime}</span>
                    <span>📂 ${task.category}</span>
                </div>
                <div class="task-actions">
                    <button class="${task.completed ? 'btn-secondary' : 'btn-primary'}" onclick="toggleComplete('${task.id}')">
                        ${task.completed ? 'Desfazer' : 'Concluir'}
                    </button>
                    <button class="btn-secondary" onclick="editTask('${task.id}')">Editar</button>
                    <button class="btn-danger" onclick="deleteTask('${task.id}')">Excluir</button>
                </div>
            `;
            
            // Eventos de Drag & Drop para Desktop
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragover', handleDragOver);
            card.addEventListener('drop', handleDrop);
            card.addEventListener('dragend', handleDragEnd);

            tasksContainer.appendChild(card);
        });
        
        if (filtered.length === 0) {
            tasksContainer.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1;">Nenhuma tarefa encontrada.</p>';
        }
    }

    // === CALENDÁRIO ===
    function renderCalendar() {
        const year = currentDateObj.getFullYear();
        const month = currentDateObj.getMonth();
        const calContainer = document.getElementById('calendarDays');
        calContainer.innerHTML = '';

        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        document.getElementById('monthDisplay').innerText = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const todayStr = new Date().toISOString().split('T')[0];

        // Células vazias
        for (let i = 0; i < firstDay; i++) {
            calContainer.innerHTML += `<div class="cal-day empty"></div>`;
        }

        // Dias do mês
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const isToday = dateStr === todayStr ? 'today' : '';
            
            const dayTasks = tasks.filter(t => t.dueDate === dateStr);
            let dotsHTML = dayTasks.map(t => `<span class="cal-task-dot dot-${getTaskStatus(t)}" title="${t.title}"></span>`).join('');

            const dayDiv = document.createElement('div');
            dayDiv.className = `cal-day ${isToday}`;
            dayDiv.innerHTML = `<span class="day-number">${i}</span>${dotsHTML}`;
            
            // Clicar no dia abre modal
            dayDiv.addEventListener('click', () => {
                document.getElementById('taskDate').value = dateStr;
                openModal();
            });

            calContainer.appendChild(dayDiv);
        }
    }

    // === DRAG & DROP LOGIC ===
    function handleDragStart(e) {
        currentDragSource = this;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => this.classList.add('dragging'), 0);
    }
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    }
    function handleDrop(e) {
        e.stopPropagation();
        if (currentDragSource !== this) {
            tasksContainer.insertBefore(currentDragSource, this);
        }
        return false;
    }
    function handleDragEnd() {
        this.classList.remove('dragging');
    }

    // === UTILITÁRIOS ===
    function openModal() {
        modal.classList.add('active');
        if(!document.getElementById('taskId').value) {
            taskForm.reset();
            document.getElementById('modalTitle').innerText = 'Nova Tarefa';
            if(!document.getElementById('taskDate').value) {
                document.getElementById('taskDate').value = new Date().toISOString().split('T')[0];
            }
        }
    }

    function closeModal() {
        modal.classList.remove('active');
        setTimeout(() => {
            taskForm.reset();
            document.getElementById('taskId').value = '';
        }, 300); // Aguarda a animação
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerText = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    function exportCSV() {
        if(tasks.length === 0) return showToast("Não há tarefas para exportar.");
        
        let csvContent = "data:text/csv;charset=utf-8,ID,Título,Categoria,Prioridade,Data,Status\n";
        tasks.forEach(t => {
            const status = t.completed ? "Concluída" : "Pendente";
            csvContent += `${t.id},"${t.title}","${t.category}","${t.priority}",${t.dueDate},${status}\n`;
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "tarefas_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
