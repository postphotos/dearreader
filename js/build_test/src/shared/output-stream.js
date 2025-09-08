"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutputServerEventStream = void 0;
class OutputServerEventStream {
    write(data) {
        console.log('OutputServerEventStream write:', data);
    }
    end() {
        console.log('OutputServerEventStream ended');
    }
}
exports.OutputServerEventStream = OutputServerEventStream;
//# sourceMappingURL=output-stream.js.map