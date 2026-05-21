import pandas as pd
import numpy as np
import re
import os

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def clean_municipality_name(name):
    if not isinstance(name, str):
        return "Desconhecido"
    name = name.strip()
    # Normalize Macaé with trailing space or typo
    if name == "Maca" or name == "Macaé" or name.startswith("Macaé") or name.startswith("Maca"):
        return "Macaé"
    if name == "So Joo da Barra" or name == "São João da Barra":
        return "São João da Barra"
    if name == "So Francisco de Itabapoana" or name == "São Francisco de Itabapoana":
        return "São Francisco de Itabapoana"
    if name == "Quissam" or name == "Quissamã":
        return "Quissamã"
    if name == "Armao dos Bzios" or name == "Armação dos Búzios" or "Búzios" in name or "Buzios" in name:
        return "Armação dos Búzios"
    if name == "Maratazes" or name == "Marataízes":
        return "Marataízes"
    if name == "Pima" or name == "Piúma":
        return "Piúma"
    return name

def map_activity_to_meta(act_name, metas_list):
    act_name = str(act_name).strip()
    
    # Try exact match first
    for meta in metas_list:
        if act_name == meta:
            return meta
            
    # Try case-insensitive exact match
    for meta in metas_list:
        if act_name.lower() == meta.lower():
            return meta
            
    # Check if activity starts with the meta name followed by a separator (e.g. " - ")
    for meta in metas_list:
        if act_name.startswith(meta):
            return meta
            
    # Check for containing of meta names in specific ways
    # Let's do a substring match for longer meta strings
    for meta in metas_list:
        if len(meta) > 15 and meta in act_name:
            return meta
            
    # Custom rules for prefixes and keywords to map to the 21 official metas
    if act_name.startswith("Representação") or act_name.startswith("Representao"):
        return "Representação"
    if act_name.startswith("Participação") or act_name.startswith("Participao"):
        return "Participação"
    
    if act_name.startswith("Grupo de Trabalho") or act_name.startswith("GT ") or act_name.startswith("Grupo de trabalho"):
        for meta in metas_list:
            if meta != "Grupo de Trabalho" and meta in act_name:
                return meta
        return "Grupo de Trabalho"
        
    if act_name.startswith("Grupo de Estudo") or act_name.startswith("GE "):
        for meta in metas_list:
            if meta != "Grupo de Estudo" and meta in act_name:
                return meta
        return "Grupo de Estudo"
        
    if act_name.startswith("Oficina Temática") or act_name.startswith("Oficina Temtica"):
        return "Oficina Temática"
        
    if act_name.startswith("Promover formações abertas") or act_name.startswith("Promover formaes abertas"):
        return "Promover formações abertas à comunidade"
        
    if act_name.startswith("Realizar formações para os membros") or act_name.startswith("Realizar formaes para os membros"):
        return "Realizar formações para os membros dos Grupos Gestores Locais (oficinas temáticas do NO)"
        
    if act_name.startswith("Reunião de GGL") or "Reunião de GGL" in act_name or "Reunio de GGL" in act_name:
        return "Reunião de GGL"
        
    if act_name.startswith("Elaborar textos informativos") or "textos informativos" in act_name.lower():
        return "Elaborar textos informativos"
        
    if act_name.startswith("Elaborar material informativo") or "material informativo" in act_name.lower():
        return "Elaborar material informativo"
        
    if "orçamento público" in act_name.lower() or "orcamento publico" in act_name.lower():
        if "monitorar" in act_name.lower():
            return "Monitorar e divulgar o orçamento público"
        return "Divulgar o orçamento público"
        
    if "intercâmbio" in act_name.lower() or "intercambio" in act_name.lower():
        return "Realizar intercâmbios para troca de experiências"
        
    if "dossiê" in act_name.lower() or "dossie" in act_name.lower():
        return "Produzir dossiê das ações de incidência política"
        
    if "mídias sociais" in act_name.lower() or "midias sociais" in act_name.lower():
        return "Produzir textos para diferentes mídias sociais do projeto"
        
    if "formações abertas" in act_name.lower() or "formacoes abertas" in act_name.lower():
        return "Promover formações abertas à comunidade"
        
    if "ações conjuntas" in act_name.lower() or "acoes conjuntas" in act_name.lower():
        return "Realizar ações conjuntas com instituições e demais PEAs voltadas para acompanhamento, monitoramento e incidência política"
        
    if "diálogo com o poder público" in act_name.lower() or "dialogo com o poder publico" in act_name.lower():
        return "Realizar diálogo com o poder público (reuniões) a fim de apresentar demandas e propostas"
        
    if "eventos locais e regionais" in act_name.lower():
        return "Realizar eventos locais e regionais para deliberações de propostas de incidência política"
        
    if "saberes dos ggls" in act_name.lower() or "saberes dos GGLs" in act_name:
        return "Criar e disponibilizar arquivo de memória com ações e saberes dos GGLs"
        
    if "legislações socioespaciais" in act_name.lower() or "legislacoes socioespaciais" in act_name.lower():
        return "Mapear e monitorar a aplicação das legislações socioespaciais de acordo com os impactos da cadeia da indústria de petróleo"
        
    if "impactos socioespaciais" in act_name.lower():
        return "Mapear e monitorar os impactos socioespaciais da cadeia da indústria do petróleo e gás"
        
    return None

def load_data(
    activities_file=None,
    metas_file=None
):
    if activities_file is None:
        activities_file = os.path.join(_BASE_DIR, 'Planilha de atividades (anexo 2) (1).xlsx')
    if metas_file is None:
        metas_file = os.path.join(_BASE_DIR, 'Quadro de metas (anexo 1).xlsx')
    # Load Metas
    df_met = pd.read_excel(metas_file, sheet_name='Metas')
    df_met['Atividades_clean'] = df_met['Atividades'].astype(str).str.strip()
    
    # Normalize metas strings (replace unicode representation mismatches if any)
    # The metas names in the sheet have trailing spaces and accents. We keep standard accents.
    metas_mapping = {}
    for idx, row in df_met.iterrows():
        orig = row['Atividades_clean']
        clean = orig
        # Fix encoding artifacts if they exist
        clean = clean.replace('Reunio', 'Reunião')
        clean = clean.replace('Representao', 'Representação')
        clean = clean.replace('Participao', 'Participação')
        clean = clean.replace('formaes', 'formações')
        clean = clean.replace('aes', 'ações')
        clean = clean.replace('aplicao', 'aplicação')
        clean = clean.replace('legislaes', 'legislações')
        clean = clean.replace('indstria', 'indústria')
        clean = clean.replace('petrleo', 'petróleo')
        clean = clean.replace('gs', 'gás')
        clean = clean.replace('oramento', 'orçamento')
        clean = clean.replace('pblico', 'público')
        clean = clean.replace('Temtica', 'Temática')
        clean = re.sub(r'dossi\xea*', 'dossi\xea', clean)  # normaliza dossi/dossiê/dossiêê → dossiê
        clean = clean.replace('poltica', 'política')
        clean = clean.replace('mdias', 'mídias')
        clean = clean.replace('instituies', 'instituições')
        clean = clean.replace('dilogo', 'diálogo')
        clean = clean.replace('deliberaes', 'deliberações')
        clean = clean.replace('experincias', 'experiências')
        clean = clean.replace('memria', 'memória')
        clean = clean.replace('monitor\xe7amento', 'monitoramento')  # ç-artifact in monitoramento
        # Standardize specific items with trailing spaces
        if clean == "Grupo de Estudo": clean = "Grupo de Estudo"
        if clean == "Grupo de Trabalho": clean = "Grupo de Trabalho"
        if clean == "Oficina Temática": clean = "Oficina Temática"
        if clean == "Participação": clean = "Participação"
        if clean == "Promover formações abertas à comunidade": clean = "Promover formações abertas à comunidade"
        if clean == "Realizar intercâmbios para troca de experiências": clean = "Realizar intercâmbios para troca de experiências"
        if clean == "Representação": clean = "Representação"
        
        metas_mapping[orig] = clean
        
    df_met['Atividade_Padrao'] = df_met['Atividades_clean'].map(metas_mapping)
    
    # Load Activities
    df_act = pd.read_excel(activities_file, sheet_name='Planilha4', header=1)
    
    # Clean Column Names
    # ['Atividade', 'Data prevista', 'Data realizada', 'Município', 'Local', 'Número de participantes', 'Resultados Alcançados']
    df_act.columns = [c.replace('Municpio', 'Município').replace('Nmero de participantes', 'Número de participantes').replace('Resultados Alcanados', 'Resultados Alcançados') for c in df_act.columns]
    
    # Drop exact duplicate rows (3 rows)
    df_act = df_act.drop_duplicates().reset_index(drop=True)
    
    # Clean Municipality Names
    df_act['Município'] = df_act['Município'].apply(clean_municipality_name)
    
    # Clean Date Columns
    df_act['Data realizada'] = pd.to_datetime(df_act['Data realizada'])
    
    # Check if Planned
    df_act['Planejada'] = df_act['Data prevista'].apply(lambda x: "Não Prevista" if str(x).strip() == "Atividade no prevista" or str(x).strip() == "Atividade não prevista" else "Planejada")
    
    # Parse Data prevista to date or NaT
    def parse_prevista(x):
        s = str(x).strip()
        if "não prevista" in s.lower() or "no prevista" in s.lower():
            return pd.NaT
        try:
            return pd.to_datetime(x)
        except:
            return pd.NaT
            
    df_act['Data prevista_dt'] = df_act['Data prevista'].apply(parse_prevista)
    
    # Map Activities to Metas
    metas_list = df_met['Atividade_Padrao'].tolist()
    df_act['Atividade_Mapeada'] = df_act['Atividade'].apply(lambda x: map_activity_to_meta(x, metas_list))
    
    # Fill in participants nulls (if any) with 0 or media
    df_act['Número de participantes'] = df_act['Número de participantes'].fillna(0).astype(int)
    
    # If unmapped exists, default to 'Grupo de Trabalho' (since it is the largest category)
    df_act['Atividade_Mapeada'] = df_act['Atividade_Mapeada'].fillna("Grupo de Trabalho")
    
    return df_act, df_met

def get_metrics_summary(df_act, df_met):
    # Total Activities (cleaned of duplicates)
    total_activities = len(df_act)
    
    if total_activities == 0:
        return {
            "total_activities": 0,
            "media_mensal": 0.0,
            "total_participants": 0,
            "avg_participants": 0.0,
            "cumprimento_global": 0.0,
            "total_meta_sum": int(df_met['Meta'].sum()),
            "active_municipalities": 0,
            "unplanned_ratio": 0.0,
            "planned_ratio": 0.0,
            "pontualidade_rate": 0.0,
            "total_months": 0
        }

    # Monthly Average
    df_act['Ano_Mes'] = df_act['Data realizada'].dt.to_period('M')
    total_months = df_act['Ano_Mes'].nunique()
    if total_months == 0:
        total_months = 1
    media_mensal = round(total_activities / total_months, 1)

    # Total Participants Mobilized
    total_participants = int(df_act['Número de participantes'].sum())

    # Average Participants per Activity
    avg_raw = df_act['Número de participantes'].mean()
    avg_participants = round(float(avg_raw), 2) if pd.notna(avg_raw) else 0.0

    # Goals fulfillment
    realizado_counts = df_act['Atividade_Mapeada'].value_counts().to_dict()

    # Total metas sum
    total_meta_sum = int(df_met['Meta'].sum())
    cumprimento_global = round((total_activities / total_meta_sum) * 100, 1) if total_meta_sum > 0 else 0.0

    active_municipalities = df_act['Município'].nunique()

    # Planned vs Unplanned percentage
    planned_counts = df_act['Planejada'].value_counts()
    unplanned_ratio = round((planned_counts.get("Não Prevista", 0) / total_activities) * 100, 1)
    planned_ratio = round((planned_counts.get("Planejada", 0) / total_activities) * 100, 1)
    
    # Punctuality rate of planned activities (realized <= planned)
    df_planned = df_act[df_act['Planejada'] == 'Planejada'].copy()
    if len(df_planned) > 0:
        df_planned['No_Prazo'] = df_planned['Data realizada'] <= df_planned['Data prevista_dt']
        pontualidade_rate = round((df_planned['No_Prazo'].sum() / len(df_planned)) * 100, 1)
    else:
        pontualidade_rate = 0.0
        
    return {
        "total_activities": total_activities,
        "media_mensal": media_mensal,
        "total_participants": total_participants,
        "avg_participants": avg_participants,
        "cumprimento_global": cumprimento_global,
        "total_meta_sum": total_meta_sum,
        "active_municipalities": active_municipalities,
        "unplanned_ratio": unplanned_ratio,
        "planned_ratio": planned_ratio,
        "pontualidade_rate": pontualidade_rate,
        "total_months": total_months
    }

def get_chart_data(df_act, df_met):
    # 1. Monthly Trend
    df_act['Ano_Mes_Str'] = df_act['Data realizada'].dt.strftime('%Y-%m')
    trend = df_act.groupby('Ano_Mes_Str').size().reset_index(name='Quantidade')
    trend_data = trend.to_dict(orient='records')
    
    # 2. Meta vs Realizado
    realizado_counts = df_act['Atividade_Mapeada'].value_counts().to_dict()
    df_met_chart = df_met.copy()
    df_met_chart['Realizado'] = df_met_chart['Atividade_Padrao'].map(realizado_counts).fillna(0).astype(int)
    df_met_chart['Progresso_%'] = np.round((df_met_chart['Realizado'] / df_met_chart['Meta']) * 100, 1)
    # Sort by progress or realization
    metas_data = df_met_chart[['Atividade_Padrao', 'Meta', 'Realizado', 'Progresso_%']].to_dict(orient='records')
    
    # 3. Municipalities breakdown
    muni = df_act.groupby('Município').agg(
        Quantidade=('Atividade', 'count'),
        Participantes=('Número de participantes', 'sum')
    ).reset_index()
    muni = muni.sort_values(by='Quantidade', ascending=False)
    muni_data = muni.to_dict(orient='records')
    
    # 4. Planned vs Unplanned Breakdown
    plan_data = df_act['Planejada'].value_counts().reset_index()
    plan_data.columns = ['Tipo', 'Quantidade']
    total_rows = len(df_act)
    plan_data['Percentual'] = np.round((plan_data['Quantidade'] / total_rows) * 100, 1) if total_rows > 0 else 0.0
    plan_data_dict = plan_data.to_dict(orient='records')
    
    return {
        "trend": trend_data,
        "metas": metas_data,
        "municipalities": muni_data,
        "planned_vs_unplanned": plan_data_dict
    }

if __name__ == '__main__':
    # Test load
    df_act, df_met = load_data()
    metrics = get_metrics_summary(df_act, df_met)
    charts = get_chart_data(df_act, df_met)
    print("Metrics:")
    print(metrics)
    print("\nMetas Table Sample:")
    print(pd.DataFrame(charts['metas']).head())
    print("\nMunicipalities Sample:")
    print(pd.DataFrame(charts['municipalities']).head())
