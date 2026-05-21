// Planeja+ Dashboard Controller

document.addEventListener("DOMContentLoaded", () => {
    // Current Dashboard State
    let currentState = {
        municipalities: [], // empty = Todos
        planned: "Todos",
        category: "Todos",
        startDate: "",
        endDate: "",
        search: "",
        page: 1,
        pageSize: 10
    };

    // Chart Instances (to destroy and recreate on update)
    let charts = {
        trend: null,
        planning: null,
        metas: null,
        municipalities: null,
        royalties: null,
        royaltiesAbsolute: null
    };

    // -------------------------------------------------------------
    // 0. Theme Styling Helpers & Clock
    // -------------------------------------------------------------
    function isDark() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }
    
    function gc2() {
        // Grid lines color
        return isDark() ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)';
    }
    
    function tc() {
        // Text labels color
        return isDark() ? '#e2e8f0' : '#0f172a';
    }
    
    function tm() {
        // Muted details color
        return isDark() ? '#94a3b8' : '#64748b';
    }

    // Live clock running
    setInterval(() => {
        const now = new Date();
        const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);
        document.getElementById('clk').innerText = `SYS ${dateStr} UTC`;
    }, 1000);

    // Theme toggler action
    function toggleTheme() {
        const h = document.documentElement;
        const currentIsDark = h.getAttribute('data-theme') === 'dark';
        h.setAttribute('data-theme', currentIsDark ? 'light' : 'dark');
        document.getElementById('tbtn').innerText = currentIsDark ? '[ DARK ]' : '[ LIGHT ]';
        
        // Redraw all charts to update grid/label colors instantly
        refreshDashboardData();
        if (document.getElementById("tab-royalties").classList.contains("active")) {
            loadRoyaltiesTab();
        }
    }
    document.getElementById('tbtn').addEventListener('click', toggleTheme);

    // -------------------------------------------------------------
    // 1. Tab Navigation
    // -------------------------------------------------------------
    const menuItems = document.querySelectorAll(".tabs-nav .tbtn");
    const tabContents = document.querySelectorAll(".tab-content");

    menuItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetTab = item.getAttribute("data-tab");
            
            // Toggle menu active state
            menuItems.forEach(menu => menu.classList.remove("active"));
            item.classList.add("active");
            
            // Toggle content visibility
            tabContents.forEach(content => {
                if (content.id === targetTab) {
                    content.classList.add("active");
                } else {
                    content.classList.remove("active");
                }
            });

            // Trigger specific tab loading functions
            if (targetTab === "tab-royalties") {
                loadRoyaltiesTab();
            } else {
                refreshDashboardData();
            }
        });
    });

    // -------------------------------------------------------------
    // 2. Load Filter Dropdowns
    // -------------------------------------------------------------
    function updateMunicipalityDisplay() {
        const display = document.getElementById("ms-display-municipio");
        const sel = currentState.municipalities;
        if (sel.length === 0) {
            display.innerHTML = "Todos os Municípios";
        } else if (sel.length === 1) {
            display.textContent = sel[0];
        } else {
            display.innerHTML = `<span class="ms-badge">${sel.length}</span> municípios selecionados`;
        }
    }

    async function loadFilterOptions() {
        try {
            // Load Municipalities — build custom multiselect
            const munisRes = await fetch("/api/municipalities");
            const munis = await munisRes.json();
            const muniList = munis.filter(m => m !== "Todos");
            const dropdown = document.getElementById("ms-dropdown-municipio");

            dropdown.innerHTML = `
                <label class="multiselect-option ms-todos">
                    <input type="checkbox" id="ms-cb-todos" value="Todos" checked>
                    Todos os Municípios
                </label>
            ` + muniList.map(m => `
                <label class="multiselect-option">
                    <input type="checkbox" class="ms-cb-muni" value="${m}">
                    ${m}
                </label>
            `).join("");

            // Toggle open/close
            const trigger = document.getElementById("ms-trigger-municipio");
            const container = document.getElementById("ms-municipio");
            trigger.addEventListener("click", (e) => {
                e.stopPropagation();
                container.classList.toggle("open");
            });
            document.addEventListener("click", (e) => {
                if (!container.contains(e.target)) container.classList.remove("open");
            });

            // Checkbox logic
            dropdown.addEventListener("change", (e) => {
                const todosCb = document.getElementById("ms-cb-todos");
                const muniCbs = dropdown.querySelectorAll(".ms-cb-muni");

                if (e.target === todosCb) {
                    if (todosCb.checked) muniCbs.forEach(cb => cb.checked = false);
                    else todosCb.checked = true; // keep at least one checked
                } else {
                    const anyChecked = [...muniCbs].some(cb => cb.checked);
                    todosCb.checked = !anyChecked;
                    if (!anyChecked) todosCb.checked = true;
                }

                currentState.municipalities = [...dropdown.querySelectorAll(".ms-cb-muni:checked")].map(cb => cb.value);
                updateMunicipalityDisplay();
                currentState.page = 1;
                refreshDashboardData();
            });

            // Load Categories (Metas)
            const catsRes = await fetch("/api/categories");
            const cats = await catsRes.json();
            const catSelect = document.getElementById("filter-categoria");
            catSelect.innerHTML = cats.map(c => `<option value="${c}">${c === 'Todos' ? 'Todas as Metas' : c}</option>`).join("");

            // Load Date Range
            const dateRangeRes = await fetch("/api/date-range");
            const dateRange = await dateRangeRes.json();
            
            const startInput = document.getElementById("filter-data-inicio");
            const endInput = document.getElementById("filter-data-fim");
            
            startInput.min = dateRange.min;
            startInput.max = dateRange.max;
            startInput.value = dateRange.min;
            
            endInput.min = dateRange.min;
            endInput.max = dateRange.max;
            endInput.value = dateRange.max;
            
            currentState.startDate = dateRange.min;
            currentState.endDate = dateRange.max;
        } catch (error) {
            console.error("Error loading filters:", error);
        }
    }

    // -------------------------------------------------------------
    // 3. Fetch and Render KPIs & Charts
    // -------------------------------------------------------------
    function getMunicipalityParam() {
        return currentState.municipalities.length === 0 ? "Todos" : currentState.municipalities.join(",");
    }

    async function refreshDashboardData() {
        const queryParams = new URLSearchParams({
            municipality: getMunicipalityParam(),
            planned: currentState.planned,
            start_date: currentState.startDate,
            end_date: currentState.endDate
        }).toString();

        try {
            // Fetch Metrics
            const metricsRes = await fetch(`/api/metrics?${queryParams}`);
            const metrics = await metricsRes.json();
            updateKPICards(metrics);

            // Fetch Chart Data
            const chartsRes = await fetch(`/api/charts?${queryParams}`);
            const chartData = await chartsRes.json();
            renderDashboardCharts(chartData);

            // Fetch Table Data
            refreshTableData();
        } catch (error) {
            console.error("Error refreshing dashboard data:", error);
        }
    }

    function updateKPICards(m) {
        document.getElementById("kpi-total-activities").textContent = m.total_activities.toLocaleString('pt-BR');
        document.getElementById("kpi-media-mensal").textContent = m.media_mensal.toLocaleString('pt-BR');
        document.getElementById("kpi-total-participants").textContent = m.total_participants.toLocaleString('pt-BR');
        document.getElementById("kpi-avg-participants").textContent = m.avg_participants.toLocaleString('pt-BR');
        document.getElementById("kpi-active-municipalities").textContent = m.active_municipalities;
        document.getElementById("kpi-unplanned-ratio").textContent = `${m.unplanned_ratio.toLocaleString('pt-BR')}%`;
        document.getElementById("kpi-pontualidade-rate").textContent = `${m.pontualidade_rate.toLocaleString('pt-BR')}%`;

        // Update Cumprimento Global bar
        document.getElementById("kpi-progress-percent").textContent = `${m.cumprimento_global.toLocaleString('pt-BR')}%`;
        document.getElementById("kpi-progress-bar").style.width = `${Math.min(m.cumprimento_global, 100)}%`;
        document.getElementById("kpi-progress-detail").textContent = `${m.total_activities.toLocaleString('pt-BR')} de ${m.total_meta_sum.toLocaleString('pt-BR')} previstas`;
    }

    function renderDashboardCharts(data) {
        // Chart 1: Monthly Trend (Line Chart)
        if (charts.trend) charts.trend.destroy();
        const ctxTrend = document.getElementById("chart-monthly-trend").getContext("2d");
        
        // Filter trend data to show only up to Apr/2025 (2025-04)
        const trendDataFiltered = data.trend.filter(d => d.Ano_Mes_Str <= '2025-04');
        
        charts.trend = new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: trendDataFiltered.map(d => formatYearMonth(d.Ano_Mes_Str)),
                datasets: [{
                    label: 'Atividades Realizadas',
                    data: trendDataFiltered.map(d => d.Quantidade),
                    borderColor: '#1b8cc4', // Logo Blue
                    backgroundColor: 'rgba(27, 140, 196, 0.08)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: '#1b8cc4',
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { 
                        grid: { display: false }, 
                        ticks: { color: tm(), font: { family: 'Inter', size: 11 } } 
                    },
                    y: { 
                        grid: { color: gc2() }, 
                        ticks: { color: tm(), font: { family: 'Inter', size: 11 } },
                        beginAtZero: true
                    }
                }
            }
        });

        // Chart 2: Planned vs Unplanned (Donut)
        if (charts.planning) charts.planning.destroy();
        const ctxPlan = document.getElementById("chart-planning-donut").getContext("2d");
        
        const totalPlanningVal = data.planned_vs_unplanned.reduce((sum, item) => sum + item.Quantidade, 0);
        document.getElementById("donut-total-val").textContent = totalPlanningVal.toLocaleString('pt-BR');

        charts.planning = new Chart(ctxPlan, {
            type: 'doughnut',
            data: {
                labels: data.planned_vs_unplanned.map(d => d.Tipo),
                datasets: [{
                    data: data.planned_vs_unplanned.map(d => d.Quantidade),
                    backgroundColor: ['#e68815', '#1b8cc4'], // Orange, Blue
                    borderColor: isDark() ? '#0c0e27' : '#ffffff',
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                cutout: '72%'
            }
        });

        // Build Custom Donut Legend
        const donutLegend = document.getElementById("donut-legend");
        donutLegend.innerHTML = data.planned_vs_unplanned.map((item, idx) => {
            const colors = ['#e68815', '#1b8cc4'];
            const percent = totalPlanningVal > 0 ? ((item.Quantidade / totalPlanningVal) * 100).toFixed(1) : "0.0";
            return `
                <div class="dli">
                    <div class="dll">
                        <div class="dld" style="background:${colors[idx % colors.length]}"></div>
                        ${item.Tipo}
                    </div>
                    <div class="dlr">
                        <div class="dlp">${percent}%</div>
                        <div class="dlv">${item.Quantidade.toLocaleString('pt-BR')} ações</div>
                    </div>
                </div>
            `;
        }).join("");

        // Chart 3: Activities per Municipality (Bar Chart - NEW!)
        if (charts.municipalities) charts.municipalities.destroy();
        const ctxMuni = document.getElementById("chart-municipalities-bar").getContext("2d");
        
        // Sort municipalities by activity count descending
        const sortedMunis = [...data.municipalities].sort((a, b) => b.Quantidade - a.Quantidade);
        
        // Create professional vertical gradient for the bars (fully solid to prevent blending into background)
        const muniGradient = ctxMuni.createLinearGradient(0, 0, 0, 240);
        muniGradient.addColorStop(0, '#1b8cc4'); // Raízes Blue (solid)
        muniGradient.addColorStop(1, '#208b3a'); // Raízes Green (solid)
        
        const muniHoverGradient = ctxMuni.createLinearGradient(0, 0, 0, 240);
        muniHoverGradient.addColorStop(0, '#33a3db'); // Brighter Blue (solid)
        muniHoverGradient.addColorStop(1, '#2cb14c'); // Brighter Green (solid)
        
        charts.municipalities = new Chart(ctxMuni, {
            type: 'bar',
            data: {
                labels: sortedMunis.map(d => d.Município),
                datasets: [{
                    label: 'Atividades Executadas',
                    data: sortedMunis.map(d => d.Quantidade),
                    backgroundColor: muniGradient,
                    borderColor: '#1b8cc4',
                    borderWidth: 1,
                    hoverBackgroundColor: muniHoverGradient,
                    hoverBorderColor: '#33a3db',
                    borderRadius: 4,
                    barThickness: 12
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { 
                        ticks: { color: tc(), font: { family: 'Inter', size: 11 } }, 
                        grid: { display: false } 
                    },
                    y: { 
                        ticks: { color: tm(), font: { family: 'Inter', size: 11 } }, 
                        grid: { color: gc2() }, 
                        beginAtZero: true 
                    }
                }
            }
        });

        // Render Metas Progress List instead of Chart.js
        const metasContainer = document.getElementById("metas-progress-list");
        if (metasContainer) {
            const sortedMetas = [...data.metas].sort((a,b) => b['Progresso_%'] - a['Progresso_%']);
            metasContainer.innerHTML = sortedMetas.map(d => {
                const prog = d['Progresso_%'];
                const realized = d.Realizado;
                const target = d.Meta;
                
                // Set badge style
                const badgeClass = prog >= 100 ? "" : "pending";
                const badgeText = prog >= 100 ? "[ CONCLUÍDO ]" : `[ ${prog.toFixed(0)}% ]`;
                
                return `
                    <div class="meta-progress-item">
                        <div class="meta-progress-header">
                            <span class="meta-progress-title">${d.Atividade_Padrao}</span>
                            <span class="meta-progress-badge ${badgeClass}">${badgeText}</span>
                        </div>
                        <div class="meta-progress-bar-wrapper">
                            <div class="meta-progress-bar-bg">
                                <div class="meta-progress-bar-fill" style="width: ${Math.min(prog, 100)}%;"></div>
                            </div>
                            <span class="meta-progress-text">${realized} / ${target} AÇÕES</span>
                        </div>
                    </div>
                `;
            }).join("");
        }
    }

    // Date Helper
    function formatYearMonth(ym) {
        if (!ym) return "";
        const parts = ym.split("-");
        const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const year = parts[0].substring(2);
        const monthIdx = parseInt(parts[1]) - 1;
        return `${months[monthIdx]}/${year}`;
    }

    // Wrap long text labels into multi-line arrays
    function wrapText(str, maxChars) {
        if (!str) return [];
        const words = str.split(' ');
        const lines = [];
        let currentLine = '';
        words.forEach(word => {
            if ((currentLine + ' ' + word).trim().length <= maxChars) {
                currentLine = (currentLine + ' ' + word).trim();
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        });
        if (currentLine) {
            lines.push(currentLine);
        }
        return lines;
    }

    // -------------------------------------------------------------
    // 4. Raw Activities Table
    // -------------------------------------------------------------
    const tableBody = document.querySelector("#activities-table tbody");
    const recordCountEl = document.getElementById("table-record-count");
    const paginationInfoEl = document.getElementById("pagination-info");
    const btnPrev = document.getElementById("btn-page-prev");
    const btnNext = document.getElementById("btn-page-next");

    async function refreshTableData() {
        const queryParams = new URLSearchParams({
            municipality: getMunicipalityParam(),
            planned: currentState.planned,
            category: currentState.category,
            start_date: currentState.startDate,
            end_date: currentState.endDate,
            search: currentState.search,
            page: currentState.page,
            page_size: currentState.pageSize
        }).toString();

        tableBody.innerHTML = `<tr><td colspan="7" class="loading-cell">Carregando dados da tabela contábil...</td></tr>`;

        try {
            const res = await fetch(`/api/activities?${queryParams}`);
            const result = await res.json();
            
            renderTable(result.data);
            
            // Update pagination UI
            recordCountEl.textContent = `${result.total.toLocaleString('pt-BR')} registros`;
            paginationInfoEl.textContent = `Página ${result.page} de ${result.pages || 1}`;
            
            btnPrev.disabled = result.page <= 1;
            btnNext.disabled = result.page >= result.pages;
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="7" class="loading-cell text-red">Erro ao carregar dados.</td></tr>`;
            console.error("Error loading table data:", error);
        }
    }

    function renderTable(data) {
        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="loading-cell">Nenhum registro encontrado com os filtros selecionados.</td></tr>`;
            return;
        }

        tableBody.innerHTML = data.map(row => {
            const isPlanned = row.Planejada === "Planejada";
            const badgeClass = isPlanned ? "planejada" : "unplanned";
            return `
                <tr>
                    <td><strong>${row.Município}</strong></td>
                    <td>${row["Data realizada"]}</td>
                    <td><span style="font-size:12px; font-weight:500; color: var(--acc3);">${row.Atividade_Mapeada}</span></td>
                    <td><div style="max-width:380px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${row.Atividade}</div></td>
                    <td><span class="text-muted" style="color: var(--muted);">${row.Local}</span></td>
                    <td style="text-align:center">${row["Número de participantes"]}</td>
                    <td><span class="badge-status ${badgeClass}">${row.Planejada}</span></td>
                </tr>
            `;
        }).join("");
    }

    // Pagination Listeners
    btnPrev.addEventListener("click", () => {
        if (currentState.page > 1) {
            currentState.page--;
            refreshTableData();
        }
    });

    btnNext.addEventListener("click", () => {
        currentState.page++;
        refreshTableData();
    });

    // -------------------------------------------------------------
    // 5. Atividade 2: Royalties & Fiscal Tab
    // -------------------------------------------------------------
    async function loadRoyaltiesTab() {
        try {
            const res = await fetch("/api/royalties");
            const data = await res.json();
            
            // 1. Populate Cards
            const grid = document.getElementById("royalties-data-grid");
            grid.innerHTML = data.map(item => {
                const isExtreme = item.percentual_royalties > 60;
                const isModHigh = item.percentual_royalties > 25 && item.percentual_royalties <= 60;
                let cardClass = "moderate";
                let badgeClass = "green";
                if (isExtreme) {
                    cardClass = "extreme";
                    badgeClass = "red";
                } else if (isModHigh) {
                    cardClass = "mod-high";
                    badgeClass = "yellow";
                }
                
                return `
                    <div class="royalties-card ${cardClass}">
                        <div class="royalties-card-header">
                            <div>
                                <h3>${item.municipio}</h3>
                                <span class="bdg ${isExtreme ? 'bb' : (isModHigh ? 'bw2' : 'bt')}" style="margin-top: 4px;">${item.perfil}</span>
                            </div>
                            <span class="uf-badge">${item.uf}</span>
                        </div>
                        <div class="royalties-metrics">
                            <div class="royalty-row">
                                <span class="label" style="color: var(--muted);">Receita Orçamentária:</span>
                                <span class="value">${formatBillionReais(item.receita_total)}</span>
                            </div>
                            <div class="royalty-row">
                                <span class="label" style="color: var(--muted);">Despesa Empenhada:</span>
                                <span class="value">${formatBillionReais(item.despesa_total)}</span>
                            </div>
                            <div class="royalty-row">
                                <span class="label" style="color: var(--muted);">Royalties & PE (ANP):</span>
                                <span class="value">${formatBillionReais(item.royalties_total)}</span>
                            </div>
                            <div class="royalty-row highlight">
                                <span class="label" style="font-weight: 700;">Dependência Fiscal:</span>
                                <span class="value-percent">${item.percentual_royalties.toLocaleString('pt-BR')}%</span>
                            </div>
                        </div>
                        <div class="royalties-card-footer">
                            <h4>Análise de Vulnerabilidade</h4>
                            <p>${item.analise}</p>
                        </div>
                    </div>
                `;
            }).join("");

            // 2. Render Royalties Dependency Chart (Bar)
            if (charts.royalties) charts.royalties.destroy();
            const ctxR = document.getElementById("chart-royalties-dependency").getContext("2d");
            
            charts.royalties = new Chart(ctxR, {
                type: 'bar',
                data: {
                    labels: data.map(d => d.municipio),
                    datasets: [{
                        label: '% de Dependência de Royalties',
                        data: data.map(d => d.percentual_royalties),
                        backgroundColor: ['#ef4444', '#e68815', '#1b8cc4'], // Red, Orange, Blue
                        borderRadius: 8,
                        barThickness: 45
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: { 
                            ticks: { font: { family: 'Outfit', size: 13, weight: 600 }, color: tc() }, 
                            grid: { display: false } 
                        },
                        y: { 
                            ticks: { color: tm(), font: { family: 'Inter', size: 12 } }, 
                            grid: { color: gc2() },
                            max: 100,
                            beginAtZero: true
                        }
                    }
                }
            });

            // 3. Render Absolute Financial Comparison Chart (Grouped Bar - NEW!)
            if (charts.royaltiesAbsolute) charts.royaltiesAbsolute.destroy();
            const ctxRAbs = document.getElementById("chart-royalties-absolute-grouped").getContext("2d");
            
            charts.royaltiesAbsolute = new Chart(ctxRAbs, {
                type: 'bar',
                data: {
                    labels: data.map(d => d.municipio),
                    datasets: [
                        {
                            label: 'Receita Orçamentária Total',
                            data: data.map(d => d.receita_total),
                            backgroundColor: '#1b8cc4', // Blue
                            borderRadius: 4
                        },
                        {
                            label: 'Despesa Empenhada Total',
                            data: data.map(d => d.despesa_total),
                            backgroundColor: '#e68815', // Orange
                            borderRadius: 4
                        },
                        {
                            label: 'Receita de Royalties (ANP)',
                            data: data.map(d => d.royalties_total),
                            backgroundColor: '#208b3a', // Green
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: { font: { family: 'Inter', size: 11 }, color: tc() }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += 'R$ ' + context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { 
                            ticks: { font: { family: 'Outfit', size: 13, weight: 600 }, color: tc() }, 
                            grid: { display: false } 
                        },
                        y: { 
                            ticks: { 
                                font: { family: 'Inter', size: 11 }, 
                                color: tm(),
                                callback: function(value) {
                                    return 'R$ ' + (value / 1e9).toFixed(1) + ' bi';
                                }
                            }, 
                            grid: { color: gc2() },
                            beginAtZero: true
                        }
                    }
                }
            });
        } catch (error) {
            console.error("Error loading royalties data:", error);
        }
    }

    function formatBillionReais(val) {
        if (val >= 1000000000) {
            return `R$ ${(val / 1000000000).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} bi`;
        }
        return `R$ ${(val / 1000000).toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})} mi`;
    }



    // -------------------------------------------------------------
    // 7. Event Listeners for Filters
    // -------------------------------------------------------------
    document.getElementById("filter-planejada").addEventListener("change", (e) => {
        currentState.planned = e.target.value;
        currentState.page = 1;
        refreshDashboardData();
    });

    document.getElementById("filter-categoria").addEventListener("change", (e) => {
        currentState.category = e.target.value;
        currentState.page = 1;
        refreshTableData();
    });

    document.getElementById("filter-data-inicio").addEventListener("change", (e) => {
        currentState.startDate = e.target.value;
        const endInput = document.getElementById("filter-data-fim");
        if (endInput.value && endInput.value < e.target.value) {
            endInput.value = e.target.value;
            currentState.endDate = e.target.value;
        }
        currentState.page = 1;
        refreshDashboardData();
    });

    document.getElementById("filter-data-fim").addEventListener("change", (e) => {
        currentState.endDate = e.target.value;
        const startInput = document.getElementById("filter-data-inicio");
        if (startInput.value && startInput.value > e.target.value) {
            startInput.value = e.target.value;
            currentState.startDate = e.target.value;
        }
        currentState.page = 1;
        refreshDashboardData();
    });

    let searchTimeout;
    document.getElementById("filter-search").addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentState.search = e.target.value;
            currentState.page = 1;
            refreshTableData();
        }, 300); // Debounce typing
    });

    // -------------------------------------------------------------
    // 8. Background Particles Canvas (Raízes Corporate Theme)
    // -------------------------------------------------------------
    (function(){
        const cv = document.getElementById('bgc');
        if (!cv) return;
        const ctx = cv.getContext('2d');
        let W, H;
        const ns = [];
        
        function rsz(){
            W = cv.width = window.innerWidth;
            H = cv.height = window.innerHeight;
        }
        rsz();
        window.addEventListener('resize', rsz);
        
        // Spawn 50 nodes
        for (let i = 0; i < 50; i++) {
            ns.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                r: Math.random() * 1.6 + 0.5
            });
        }
        
        function drw(){
            ctx.clearRect(0, 0, W, H);
            const dk = isDark();
            
            // Connection lines and node colors based on theme and logo
            const lc = dk ? 'rgba(32, 139, 58, ' : 'rgba(27, 140, 196, '; // Green vs Blue connections
            const dc = dk ? 'rgba(230, 136, 21, ' : 'rgba(32, 139, 58, '; // Orange vs Green nodes
            
            // Move nodes
            ns.forEach(n => {
                n.x += n.vx;
                n.y += n.vy;
                if (n.x < 0 || n.x > W) n.vx *= -1;
                if (n.y < 0 || n.y > H) n.vy *= -1;
            });
            
            // Draw lines
            for (let i = 0; i < ns.length; i++) {
                for (let j = i + 1; j < ns.length; j++) {
                    const dx = ns[i].x - ns[j].x;
                    const dy = ns[i].y - ns[j].y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 130) {
                        ctx.beginPath();
                        ctx.moveTo(ns[i].x, ns[i].y);
                        ctx.lineTo(ns[j].x, ns[j].y);
                        ctx.strokeStyle = lc + (1 - dist / 130) * 0.22 + ')';
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
            
            // Draw nodes
            ns.forEach(n => {
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fillStyle = dc + '0.6)';
                ctx.fill();
            });
            
            requestAnimationFrame(drw);
        }
        drw();
    })();

    // -------------------------------------------------------------
    // 9. Initialization
    // -------------------------------------------------------------
    async function init() {
        await loadFilterOptions();
        await refreshDashboardData();
    }

    init();
});
