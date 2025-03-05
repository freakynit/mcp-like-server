import {cpus} from "node:os";

export default {
    definition: {
        "name": "serverCPUCount",
        "description": "Returns the number of CPU cores available on the server.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    }
    ,
    handler: async () => {
        return cpus().length;
    }
};
