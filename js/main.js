// (function() {
  import { mount } from 'svelte'
  import '../css/styles.css'
  import App from './App.svelte'
  
  const app = mount(App, {
    target: document.body
  })
  
  export default app
