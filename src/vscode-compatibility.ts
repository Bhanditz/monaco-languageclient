import { createVSCodeApi } from "./vscode-api";
import { Services } from "./services";

export = createVSCodeApi(Services.get);