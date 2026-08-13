import { useEffect } from 'react'
import { useLocalization } from './LocalizationContext'
const originals=new WeakMap<Node,string>(), lastWritten=new WeakMap<Node,string>(), originalAttributes=new WeakMap<Element,Map<string,string>>()
const ATTRIBUTES=['aria-label','placeholder','title'] as const
export function LocalizedDocument(){
 const {locale,t}=useLocalization()
 useEffect(()=>{
  const visit=(node:Node)=>{
   if(node.parentElement?.closest('[data-i18n-ignore="true"]'))return
   if(node.nodeType===Node.TEXT_NODE){const text=node.textContent??'';if(!originals.has(node))originals.set(node,text);const original=originals.get(node)??text;const rendered=locale==='en'?original:t(original);if(text!==rendered){lastWritten.set(node,rendered);node.textContent=rendered}return}
   if(!(node instanceof Element))return
   let attrs=originalAttributes.get(node);if(!attrs){attrs=new Map();originalAttributes.set(node,attrs)}
   for(const attribute of ATTRIBUTES){const current=node.getAttribute(attribute);if(current!=null&&!attrs.has(attribute))attrs.set(attribute,current);const original=attrs.get(attribute);if(original!=null)node.setAttribute(attribute,locale==='en'?original:t(original))}
   node.childNodes.forEach(visit)
  }
  visit(document.body)
  const observer=new MutationObserver((mutations)=>{for(const mutation of mutations){mutation.addedNodes.forEach(visit);if(mutation.type==='characterData'){const current=mutation.target.textContent??'';if(lastWritten.get(mutation.target)===current){lastWritten.delete(mutation.target);continue}originals.set(mutation.target,current);visit(mutation.target)}}})
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});return()=>observer.disconnect()
 },[locale,t])
 return null
}
