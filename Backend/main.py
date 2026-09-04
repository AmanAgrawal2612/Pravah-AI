from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import networkx as nx
from ml_pipeline import FloodNowcastingModel

app = FastAPI(title="Urban Flood Nowcasting API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline = FloodNowcastingModel(target_location="Dadar, Mumbai, Maharashtra, India")
pipeline.stage_3_build_drainage_network()
pipeline.stage_4_train_flood_model()
PRECOMPUTED_PREDICTIONS = pipeline.run_inference()

class RouteRequest(BaseModel):
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    time_offset: int = 0 

@app.get("/api/network")
def get_network():
    if pipeline.graph is None:
        raise HTTPException(status_code=500, detail="Graph not initialized")
    nodes = [{"id": n, "lat": data['y'], "lon": data['x']} for n, data in pipeline.graph.nodes(data=True)]
    edges = []
    for u, v, key, data in pipeline.graph.edges(keys=True, data=True):
        u_data = pipeline.graph.nodes[u]
        v_data = pipeline.graph.nodes[v]
        edges.append({
            "id": f"{u}-{v}", "source": u, "target": v,
            "start": [u_data['y'], u_data['x']], "end": [v_data['y'], v_data['x']]
        })
    return {"nodes": nodes, "edges": edges}

@app.get("/api/flood-data")
def get_flood_data():
    return {"predictions": PRECOMPUTED_PREDICTIONS}

@app.post("/api/safe-route")
def get_safe_route(request: RouteRequest):
    G = pipeline.graph
    import osmnx as ox
    try:
        orig = ox.distance.nearest_nodes(G, request.start_lon, request.start_lat)
        dest = ox.distance.nearest_nodes(G, request.end_lon, request.end_lat)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    predictions = pipeline.run_inference(time_steps=[request.time_offset])
    def weight_func(u, v, d):
        edge_id = f"{u}-{v}"
        depth = predictions.get(edge_id, {}).get(request.time_offset, 0.0)
        base = d.get('length', 1.0)
        if depth > 15: return base * 1000
        elif depth > 5: return base * 10
        return base

    try:
        route = nx.shortest_path(G, orig, dest, weight=weight_func)
        return {"route": [[G.nodes[n]['y'], G.nodes[n]['x']] for n in route]}
    except nx.NetworkXNoPath:
        raise HTTPException(status_code=404, detail="No path found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

