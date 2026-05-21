from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import pandas as pd
import numpy as np
from data_processor import load_data, get_metrics_summary, get_chart_data

app = FastAPI(title="Planeja+ Dashboard API", version="1.0.0")

# Load and clean data on startup
df_act, df_met = load_data()

@app.get("/api/metrics")
def read_metrics(municipality: str = None, planned: str = None, start_date: str = None, end_date: str = None):
    # Apply filters dynamically if provided
    filtered_act = df_act.copy()
    if municipality and municipality != "Todos":
        muni_list = [m.strip() for m in municipality.split(",") if m.strip()]
        filtered_act = filtered_act[filtered_act["Município"].isin(muni_list)]
    if planned and planned != "Todos":
        filtered_act = filtered_act[filtered_act["Planejada"] == planned]
    if start_date:
        try:
            start_dt = pd.to_datetime(start_date)
            filtered_act = filtered_act[filtered_act["Data realizada"] >= start_dt]
        except:
            pass
    if end_date:
        try:
            end_dt = pd.to_datetime(end_date)
            filtered_act = filtered_act[filtered_act["Data realizada"] <= end_dt]
        except:
            pass
        
    return get_metrics_summary(filtered_act, df_met)

@app.get("/api/charts")
def read_charts(municipality: str = None, planned: str = None, start_date: str = None, end_date: str = None):
    # Apply filters dynamically if provided
    filtered_act = df_act.copy()
    if municipality and municipality != "Todos":
        muni_list = [m.strip() for m in municipality.split(",") if m.strip()]
        filtered_act = filtered_act[filtered_act["Município"].isin(muni_list)]
    if planned and planned != "Todos":
        filtered_act = filtered_act[filtered_act["Planejada"] == planned]
    if start_date:
        try:
            start_dt = pd.to_datetime(start_date)
            filtered_act = filtered_act[filtered_act["Data realizada"] >= start_dt]
        except:
            pass
    if end_date:
        try:
            end_dt = pd.to_datetime(end_date)
            filtered_act = filtered_act[filtered_act["Data realizada"] <= end_dt]
        except:
            pass
        
    return get_chart_data(filtered_act, df_met)

@app.get("/api/municipalities")
def get_municipalities_list():
    # Return sorted list of active municipalities
    munis = sorted(df_act["Município"].dropna().unique().tolist())
    return ["Todos"] + munis

@app.get("/api/categories")
def get_categories_list():
    # Return list of mapped categories
    cats = sorted(df_met["Atividade_Padrao"].unique().tolist())
    return ["Todos"] + cats

@app.get("/api/date-range")
def get_date_range():
    # Get min and max dates from df_act
    min_date = df_act["Data realizada"].min()
    max_date = df_act["Data realizada"].max()
    
    min_str = min_date.strftime('%Y-%m-%d') if not pd.isna(min_date) else ""
    max_str = max_date.strftime('%Y-%m-%d') if not pd.isna(max_date) else ""
    
    return {
        "min": min_str,
        "max": max_str
    }

@app.get("/api/dates")
def get_dates_list():
    # Return sorted list of unique dates formatted as DD/MM/YYYY
    dates = sorted(df_act["Data realizada"].dropna().unique())
    dates_str = [pd.to_datetime(d).strftime('%d/%m/%Y') for d in dates]
    return ["Todos"] + dates_str

@app.get("/api/activities")
def read_activities(
    municipality: str = "Todos",
    planned: str = "Todos",
    category: str = "Todos",
    start_date: str = None,
    end_date: str = None,
    search: str = "",
    page: int = 1,
    page_size: int = 10
):
    filtered_act = df_act.copy()
    
    if municipality and municipality != "Todos":
        muni_list = [m.strip() for m in municipality.split(",") if m.strip()]
        filtered_act = filtered_act[filtered_act["Município"].isin(muni_list)]
    if planned and planned != "Todos":
        filtered_act = filtered_act[filtered_act["Planejada"] == planned]
    if category and category != "Todos":
        filtered_act = filtered_act[filtered_act["Atividade_Mapeada"] == category]
    if start_date:
        try:
            start_dt = pd.to_datetime(start_date)
            filtered_act = filtered_act[filtered_act["Data realizada"] >= start_dt]
        except:
            pass
    if end_date:
        try:
            end_dt = pd.to_datetime(end_date)
            filtered_act = filtered_act[filtered_act["Data realizada"] <= end_dt]
        except:
            pass
    if search:
        filtered_act = filtered_act[
            filtered_act["Atividade"].str.contains(search, case=False, na=False) |
            filtered_act["Local"].str.contains(search, case=False, na=False) |
            filtered_act["Resultados Alcançados"].str.contains(search, case=False, na=False)
        ]
        
    total_records = len(filtered_act)
    start = (page - 1) * page_size
    end = start + page_size
    
    # Select subset of columns to send
    cols = ["Atividade", "Atividade_Mapeada", "Data realizada", "Município", "Local", "Número de participantes", "Resultados Alcançados", "Planejada"]
    records = filtered_act[cols].iloc[start:end].copy()
    
    # Format dates to string
    records["Data realizada"] = records["Data realizada"].dt.strftime('%d/%m/%Y')
    
    return {
        "total": total_records,
        "page": page,
        "page_size": page_size,
        "pages": int(np.ceil(total_records / page_size)),
        "data": records.to_dict(orient='records')
    }

@app.get("/api/royalties")
def read_royalties():
    # Fiscal data for Atividade 2 (consolidated for 2024)
    # Currency values are in Reais (R$)
    return [
        {
            "municipio": "Maricá",
            "uf": "RJ",
            "receita_total": 6870561357.88,
            "despesa_total": 6358650972.80,
            "royalties_total": 2692586105.78,
            "percentual_royalties": 39.2,
            "fontes": "Portal da Transparência de Maricá, Comparativo da Receita (Anexo 10 - 2024), Balanço Financeiro (2024), ANP (Repasses)",
            "perfil": "Dependência Moderada-Alta",
            "analise": "Maricá lidera a arrecadação nacional de royalties. O município mantém o Fundo Soberano de Maricá como poupança pública para atenuar a volatilidade e garantir estabilidade fiscal de longo prazo."
        },
        {
            "municipio": "Niterói",
            "uf": "RJ",
            "receita_total": 6030000000.00,
            "despesa_total": 5567155432.86,
            "royalties_total": 2230000000.00,
            "percentual_royalties": 37.0,
            "fontes": "Portal da Transparência de Niterói, Fazenda Municipal (Audiência de Contas 2024), ANP (Repasses)",
            "perfil": "Dependência Moderada-Alta",
            "analise": "Niterói apresenta relevante volume de royalties e participações especiais. O município instituiu o Fundo de Equalização da Receita (FER) para preservar recursos finitos e blindar o orçamento de frustrações."
        },
        {
            "municipio": "Armação dos Búzios",
            "uf": "RJ",
            "receita_total": 635897082.11,
            "despesa_total": 551852677.58,
            "royalties_total": 168290658.37,
            "percentual_royalties": 26.47,
            "fontes": "Portal da Transparência de Búzios, Balanço Orçamentário Consolidado (Anexo 12 - 2024), ANP (Repasses)",
            "perfil": "Dependência Moderada-Alta",
            "analise": "Búzios apresenta dependência fiscal de 26,47% das compensações petrolíferas. O fluxo de receitas atua como importante indutor de investimentos locais, demandando atenção à governança e sustentabilidade orçamentária."
        }
    ]

# Setup static files directory
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)

# Mount static folder
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def read_root():
    return FileResponse(os.path.join(static_dir, "index.html"))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
