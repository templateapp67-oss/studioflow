import React from 'react';
import { isChunkLoadError,recoverScreen } from '../lib/loadScreen';
type Props={children:React.ReactNode;resetKey?:string;onRecover?:()=>void};
export class AppErrorBoundary extends React.Component<Props,{error:Error|null}> {
 declare props:Props;
 declare setState:(update:{error:Error|null})=>void;
 state:{error:Error|null}={error:null};
 static getDerivedStateFromError(error:Error){return {error};}
 componentDidCatch(error:Error,info:React.ErrorInfo){console.error('StudioFlow screen failed',error,info.componentStack);if(isChunkLoadError(error))recoverScreen();}
 componentDidUpdate(previous:Props){if(previous.resetKey!==this.props.resetKey&&this.state.error)this.setState({error:null});}
 render(){if(this.state.error)return <main role="alert" className="min-h-[50vh] flex items-center justify-center p-8"><section className="workspace-card"><h1 className="text-2xl font-bold">This screen could not open</h1><p className="my-4">{isChunkLoadError(this.state.error)?'Screen files could not load. Check your connection and load the latest version.':'Try returning to your workspace or reloading this screen.'} Your saved account data stays in Supabase.</p>{this.props.onRecover&&<button className="secondary-action mr-3" onClick={this.props.onRecover}>Back to workspace</button>}<button className="primary-action" onClick={()=>recoverScreen(true)}>Reload latest version</button><details className="mt-4 text-xs"><summary>Error details</summary><pre className="mt-2 whitespace-pre-wrap break-words">{this.state.error.message}</pre></details></section></main>;return this.props.children;}
}
