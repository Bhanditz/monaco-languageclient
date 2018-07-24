/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
    BaseLanguageClient, MessageTransports, LanguageClientOptions, CompletionParams, WillSaveTextDocumentParams
} from "vscode-languageclient/lib/client";
import * as p2c from 'vscode-languageclient/lib/protocolConverter';
import * as c2p from 'vscode-languageclient/lib/codeConverter';
import { IConnectionProvider, IConnection } from './connection';

export * from 'vscode-languageclient/lib/client';

export class MonacoLanguageClient extends BaseLanguageClient {

    protected readonly connectionProvider: IConnectionProvider;

    constructor({ id, name, clientOptions, connectionProvider }: MonacoLanguageClient.Options) {
        super(id || name.toLowerCase(), name, clientOptions);
        this.connectionProvider = connectionProvider;
        (this as any).createConnection = this.doCreateConnection.bind(this);

        // bypass LSP <=> VS Code conversion
        const bypassConversion = (result: any) => result || undefined;
        const self: {
            _p2c: p2c.Converter,
            _c2p: c2p.Converter
        } = this as any;
        self._p2c = new Proxy(self._p2c, {
            get: (target: any, prop: string) => {
                if (prop === 'asUri') {
                    return target[prop];
                }
                return bypassConversion;
            }
        });
        self._c2p = new Proxy(self._c2p, {
            get: (target: any, prop: string) => {
                if (prop === 'asUri') {
                    return target[prop];
                }
                if (prop === 'asCompletionParams') {
                    return (textDocument: any, position: any, context: any): CompletionParams => {
                        return {
                            textDocument: self._c2p.asTextDocumentIdentifier(textDocument),
                            position,
                            context
                        }
                    }
                }
                if (prop === 'asWillSaveTextDocumentParams') {
                    return (event: any): WillSaveTextDocumentParams => {
                        return {
                            textDocument: self._c2p.asTextDocumentIdentifier(event.document),
                            reason: event.reason
                        }
                    }
                }
                if (prop.endsWith('Params')) {
                    return target[prop];
                }
                return bypassConversion;
            }
        });
    }

    protected doCreateConnection(): Thenable<IConnection> {
        const errorHandler = (this as any).handleConnectionError.bind(this);
        const closeHandler = this.handleConnectionClosed.bind(this);
        return this.connectionProvider.get(errorHandler, closeHandler, this.outputChannel);
    }

    protected createMessageTransports(encoding: string): Thenable<MessageTransports> {
        throw new Error('Unsupported');
    }

}
export namespace MonacoLanguageClient {
    export interface Options {
        name: string;
        id?: string;
        clientOptions: LanguageClientOptions;
        connectionProvider: IConnectionProvider;
    }
}
