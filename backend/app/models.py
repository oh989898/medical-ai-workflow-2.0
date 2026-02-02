from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
from enum import Enum


class DataType(str, Enum):
    IMAGE = "image"
    TENSOR = "tensor"
    EMBEDDING = "embedding"
    TEXT = "text"
    LABEL = "label"
    ATTENTION = "attention"
    FEATURES = "features"
    ANY = "any"


class NodeCategory(str, Enum):
    INPUT = "input"
    TRANSFORM = "transform"
    ENCODER = "encoder"
    FUSION = "fusion"
    HEAD = "head"
    CONFIG = "config"


class Port(BaseModel):
    id: str
    name: str
    type: DataType
    description: Optional[str] = None


class InputPort(Port):
    required: bool = True
    default_value: Optional[Any] = None


class OutputPort(Port):
    pass


class ParameterType(str, Enum):
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    SELECT = "select"
    LIST = "list"
    PATH = "path"


class Parameter(BaseModel):
    id: str
    name: str
    type: ParameterType
    description: Optional[str] = None
    default_value: Optional[Any] = None
    required: bool = False
    options: Optional[List[Dict[str, Any]]] = None
    min: Optional[float] = None
    max: Optional[float] = None
    step: Optional[float] = None
    advanced: bool = False


class NodeDefinition(BaseModel):
    model_config = {"populate_by_name": True}
    
    id: str
    type: NodeCategory
    name: str
    description: str
    icon: Optional[str] = None
    inputs: List[InputPort] = []
    outputs: List[OutputPort] = []
    parameters: List[Parameter] = []
    code_template: str = Field(..., alias="codeTemplate")
    tags: Optional[List[str]] = None
    paper_url: Optional[str] = Field(None, alias="paperUrl")
    tooltip: Optional[str] = None


class NodeInstance(BaseModel):
    id: str
    type: str
    position: Dict[str, float]
    data: Dict[str, Any]


class Connection(BaseModel):
    model_config = {"populate_by_name": True}
    
    id: str
    source: str
    source_output: str = Field(..., alias="sourceOutput")
    target: str
    target_input: str = Field(..., alias="targetInput")


class Workflow(BaseModel):
    model_config = {"populate_by_name": True}
    
    id: str
    name: str
    description: Optional[str] = None
    nodes: List[NodeInstance]
    connections: List[Connection]
    created_at: str = Field(..., alias="createdAt")
    updated_at: str = Field(..., alias="updatedAt")


class CodeGenerationResult(BaseModel):
    main_py: str
    model_py: str
    dataset_py: str
    utils_py: str
    setup_check_py: str
    config_yaml: str
    requirements_txt: str
    readme_md: str


class CodeGenerationRequest(BaseModel):
    workflow: Workflow
