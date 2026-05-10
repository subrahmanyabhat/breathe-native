import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, Linking, Switch, Modal, Platform } from 'react-native';
import { applyScreenTimeLimit } from '../notifications';
import { AppData, fmtHHMM } from '../storage';
import { APPS, TECHNIQUES, Technique } from '../data';
import { DARK } from '../theme';

const safeSTStatus = () => { try { return require('../../modules/screen-time').getAuthorizationStatus(); } catch { return 'unavailable'; } };
const doAuth     = async () => { try { return await require('../../modules/screen-time').requestAuthorization(); } catch { return { authorized: false }; } };
const doPick     = async () => { try { return await require('../../modules/screen-time').showAppPicker(); } catch { return { selected: false, appCount: 0 }; } };
const doShield   = async () => { try { return await require('../../modules/screen-time').shieldApps(); } catch { return { success: false, error: 'Native module unavailable in managed build' }; } };
const doUnshield = async () => { try { return await require('../../modules/screen-time').unshieldApps(); } catch { return { success: false }; } };

const STEPS = [5,10,15,20,30,45,60,90,120];
const nextStep = (v: number, dir: number) => { const i = STEPS.indexOf(v); return STEPS[Math.max(0, Math.min(STEPS.length-1, (i<0?2:i)+dir))]; };
const EMOJIS: Record<string,string> = { instagram:'📸', tiktok:'🎵', youtube:'▶️', twitter:'𝕏' };

interface Props { data: AppData; onUpdate:(d:AppData)=>void; onStartSession:(t:Technique,app?:string)=>void; isPrem?:boolean; onShowPremium?:()=>void; }

export default function ScreentimeScreen({ data, onUpdate, onStartSession, isPrem, onShowPremium }: Props) {
  const [status,  setStatus]  = useState(safeSTStatus);
  const [loading, setLoading] = useState(false);
  const isAuth   = status === 'approved';
  const isShield = !!data.stShieldEnabled;
  const earned   = data.earnedMin || 0;
  const ae = data.appEarned  || {};
  const al = data.appLimits  || {};
  const en = data.appEnabled || {};
  const blocked = APPS.filter(a => en[a.id]);

  const reqAuth = async () => {
    setLoading(true);
    const r = await doAuth() as any;
    if (r.authorized) { setStatus('approved'); Alert.alert('Authorized', 'Now pick which apps to block.'); }
    else Alert.alert('Denied', 'Grant access in Settings.', [{text:'Open Settings',onPress:()=>Linking.openURL('App-Prefs:root=SCREENTIME')},{text:'Cancel',style:'cancel'}]);
    setLoading(false);
  };
  const [showManualPick, setShowManualPick] = useState(false);
  const pickApps = async () => {
    if (!isAuth){await reqAuth();return;}
    const r=await doPick() as any;
    if(r.selected) Alert.alert(`${r.appCount} apps selected`,'Tap Block Apps to activate.');
    else setShowManualPick(true); // fallback: show manual toggle UI
  };
  const shieldAll = async () => {
    if (!isAuth){await reqAuth();return;}
    setLoading(true);
    const r = await doShield() as any;
    if (r.success) onUpdate({...data,stShieldEnabled:true});
    else Alert.alert('Could not block',(r.error||'Pick apps first (step 2).'),[{text:'OK'}]);
    setLoading(false);
  };
  const unshieldAll = async () => { setLoading(true); const r=await doUnshield() as any; if(r.success) onUpdate({...data,stShieldEnabled:false}); setLoading(false); };
  const spend = (id:string,m:number) => { const a={...ae}; if((a[id]||0)>=m){a[id]=(a[id]||0)-m; onUpdate({...data,appEarned:a,spentMin:(data.spentMin||0)+m});} };

  // Auth status — shown as inline banner, not a gate

  // ─── APPS BLOCKED (matches screenshot) ────────────────────────────────────
  if (isShield) return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={{padding:20,paddingBottom:48}}>
        <View style={s.blockedCard}>
          <View style={s.blockedTop}>
            <View style={s.lockBox}><Text style={{fontSize:20}}>🔒</Text></View>
            <View style={{flex:1,marginLeft:12}}>
              <Text style={s.blockedTitle}>Apps Blocked</Text>
              <Text style={s.blockedSub}>Complete a breathing session to unlock</Text>
            </View>
            <View style={s.recDot}/>
          </View>
          <View style={s.blockedMeta}>
            <Text style={s.blockedMetaL}>Blocked Apps</Text>
            <TouchableOpacity onPress={unshieldAll}><Text style={s.manageBtn}>Manage →</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:16}} contentContainerStyle={{gap:8}}>
            {blocked.length===0
              ? <Text style={{color:DARK.label,fontSize:13}}>No apps selected — tap Manage</Text>
              : blocked.map(app=>(
                <View key={app.id} style={s.appPill}>
                  <Text style={{fontSize:15}}>{EMOJIS[app.id]||'📱'}</Text>
                  <Text style={s.pillTxt}>{app.name}</Text>
                  <Text style={{fontSize:12}}>🔒</Text>
                </View>
              ))
            }
          </ScrollView>
          <TouchableOpacity style={s.breatheBtn} onPress={()=>onStartSession(TECHNIQUES[0])}>
            <Text style={{fontSize:22}}>⚡</Text>
            <View style={{flex:1}}>
              <Text style={s.breatheTitle}>Breathe to Unlock Apps</Text>
              <Text style={s.breatheSub}>1 min breathing = 10 min screen</Text>
            </View>
            <View style={s.timerBadge}>
              <Text style={{fontSize:11}}>⏱</Text>
              <Text style={s.timerTxt}>{earned}m banked</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={s.poolCard}>
          <Text style={s.poolL}>SCREENTIME BANK</Text>
          <Text style={s.poolN}>{fmtHHMM(earned)}</Text>
          <Text style={s.poolS}>minutes earned · 1 min breathing = 10 min screen</Text>
        </View>

        {blocked.map(app=>(
          <View key={app.id} style={s.spendRow}>
            <View style={[s.dot,{backgroundColor:app.color}]}><Text style={s.dotTxt}>{app.initials}</Text></View>
            <View style={{flex:1}}>
              <Text style={s.spendName}>{app.name}  <Text style={{color:DARK.label,fontSize:11}}>{ae[app.id]||0}m earned</Text></Text>
              <View style={{flexDirection:'row',gap:6,marginTop:6}}>
                {[10,20,30].map(m=>(
                  <TouchableOpacity key={m} onPress={()=>spend(app.id,m)} style={[s.spendBtn,{opacity:(ae[app.id]||0)>=m?1:0.3,backgroundColor:(ae[app.id]||0)>=m?'rgba(164,142,232,0.12)':DARK.text4,borderColor:(ae[app.id]||0)>=m?'rgba(164,142,232,0.3)':DARK.border}]}>
                    <Text style={[s.spendBtnTxt,{color:(ae[app.id]||0)>=m?'#a48ee8':DARK.label}]}>use {m}m</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );

  // ─── SETUP VIEW ───────────────────────────────────────────────────────────
  return (
    <>
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={{padding:20,paddingBottom:48}}>

        {Platform.OS === 'android' ? (
          /* Android: Digital Wellbeing setup card */
          <View style={[s.authBanner,{borderColor:'rgba(100,200,100,0.3)',backgroundColor:'rgba(100,200,100,0.06)',marginBottom:14}]}>
            <Text style={{fontSize:16}}>🤖</Text>
            <View style={{flex:1,marginLeft:10}}>
              <Text style={{color:'#6fc96f',fontSize:13,fontWeight:'600'}}>Android — Digital Wellbeing</Text>
              <Text style={{color:DARK.text2,fontSize:11,marginTop:1}}>Set app timers in Digital Wellbeing settings</Text>
            </View>
            <TouchableOpacity onPress={()=>Linking.openURL('intent:#Intent;action=android.settings.DIGITAL_WELLBEING;end')} style={{backgroundColor:'rgba(100,200,100,0.15)',borderRadius:8,padding:6,paddingHorizontal:10}}>
              <Text style={{color:'#6fc96f',fontSize:12,fontWeight:'600'}}>Open →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* iOS: Screen Time auth banner */
          <TouchableOpacity onPress={reqAuth} style={[s.authBanner,{borderColor:isAuth?'rgba(79,205,216,0.3)':'rgba(232,162,60,0.3)',backgroundColor:isAuth?'rgba(79,205,216,0.08)':'rgba(232,162,60,0.08)'}]}>
            <Text style={{fontSize:16}}>{isAuth?'✓':'⚠️'}</Text>
            <View style={{flex:1,marginLeft:10}}>
              <Text style={{color:isAuth?DARK.teal:'#e8a23c',fontSize:13,fontWeight:'600'}}>
                {isAuth?'Screen Time Authorized':'Screen Time Not Authorized'}
              </Text>
              <Text style={{color:DARK.text2,fontSize:11,marginTop:1}}>
                {isAuth?'Native blocking active':'Tap to request permission → enables real app blocking'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={s.poolCard}>
          <Text style={s.poolL}>POOL BALANCE</Text>
          <Text style={s.poolN}>{fmtHHMM(earned)}</Text>
          <Text style={s.poolS}>1 min breathing = 10 min screen</Text>
        </View>
        <TouchableOpacity style={[s.tealBtn,{marginBottom:10,alignSelf:'stretch',alignItems:'center'}]} onPress={()=>setShowManualPick(true)}><Text style={s.tealBtnTxt}>⚙  Select Apps to Block</Text></TouchableOpacity>
        <TouchableOpacity style={s.blockBtn} onPress={shieldAll} disabled={loading}>
          <Text style={{fontSize:20}}>🔒</Text>
          <Text style={s.blockBtnTxt}>{loading?'Blocking…':'Block Apps Now'}</Text>
        </TouchableOpacity>
        <Text style={[s.poolL,{marginBottom:12,marginTop:20}]}>APP LIMITS</Text>
        {APPS.map(app=>{
          const on=!!en[app.id]; const lim=al[app.id]||app.limit;
          return (
            <View key={app.id} style={[s.limCard,{marginBottom:10,opacity:on?1:0.6}]}>
              <View style={s.limHead}>
                <View style={[s.dot,{backgroundColor:app.color}]}><Text style={s.dotTxt}>{app.initials}</Text></View>
                <View style={{flex:1,marginLeft:10}}>
                  <Text style={s.spendName}>{app.name}</Text>
                  <Text style={{color:DARK.text2,fontSize:12}}>block after {lim}m/day</Text>
                </View>
                <Switch value={on} onValueChange={()=>onUpdate({...data,appEnabled:{...en,[app.id]:!on}})} trackColor={{true:DARK.teal,false:DARK.text4}} thumbColor="#fff"/>
              </View>
              {on&&(
                <View style={s.limRow}>
                  <TouchableOpacity style={s.stepBtn} onPress={()=>onUpdate({...data,appLimits:{...al,[app.id]:nextStep(lim,-1)}})}><Text style={s.stepTxt}>−</Text></TouchableOpacity>
                  <Text style={s.limVal}>{lim}m</Text>
                  <TouchableOpacity style={s.stepBtn} onPress={()=>onUpdate({...data,appLimits:{...al,[app.id]:nextStep(lim,+1)}})}><Text style={s.stepTxt}>+</Text></TouchableOpacity>
                  <TouchableOpacity style={s.applyBtn} onPress={async()=>{
                    const result = await applyScreenTimeLimit(app.id, lim);
                    if(result==='applied') Alert.alert('✓ Limit Applied',`${app.name} blocked after ${lim} min/day via Screen Time.`);
                    else Alert.alert('Opening Screen Time','Set the limit manually:\n1. App Limits → Add Limit\n2. Search: '+app.name+'\n3. Set '+lim+' min\n4. Enable "Block at End of Limit"');
                  }}>
                    <Text style={s.applyTxt}>{Platform.OS==='android'?'Digital Wellbeing →':'Apply to iPhone →'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
    <Modal visible={showManualPick} transparent animationType="slide" onRequestClose={()=>setShowManualPick(false)}>
      <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.75)',justifyContent:'flex-end'}}>
        <View style={{backgroundColor:'#0d1b36',borderRadius:24,padding:24,paddingBottom:40,borderWidth:1,borderColor:'rgba(255,255,255,0.08)'}}>
          <View style={{width:40,height:4,borderRadius:2,backgroundColor:DARK.text4,alignSelf:'center',marginBottom:20}}/>
          <Text style={{color:DARK.text,fontSize:19,fontWeight:'700',marginBottom:4}}>Select Apps to Block</Text>
          <Text style={{color:DARK.text2,fontSize:13,marginBottom:20,lineHeight:18}}>Toggle apps to include them in your Blocked Apps list.</Text>
          {APPS.map(app=>{
            const on=!!en[app.id];
            return(
              <TouchableOpacity key={app.id} onPress={()=>onUpdate({...data,appEnabled:{...en,[app.id]:!on}})}
                style={{flexDirection:'row',alignItems:'center',gap:14,backgroundColor:on?`${app.color}18`:DARK.text4,borderWidth:1,borderColor:on?`${app.color}55`:DARK.border,borderRadius:14,padding:14,marginBottom:10}}>
                <View style={{width:42,height:42,borderRadius:11,backgroundColor:app.color,alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <Text style={{color:'rgba(255,255,255,0.92)',fontSize:12,fontWeight:'700'}}>{app.initials}</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={{color:DARK.text,fontSize:15,fontWeight:'600'}}>{app.name}</Text>
                  <Text style={{color:DARK.text2,fontSize:12}}>{on?'will be blocked':'not tracked'}</Text>
                </View>
                <Switch value={on} onValueChange={()=>onUpdate({...data,appEnabled:{...en,[app.id]:!on}})} trackColor={{true:DARK.teal,false:DARK.text4}} thumbColor="#fff"/>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={()=>setShowManualPick(false)} style={{backgroundColor:DARK.teal,borderRadius:13,padding:15,alignItems:'center',marginTop:4}}>
            <Text style={{color:'#07111e',fontSize:15,fontWeight:'700'}}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:DARK.bg},
  h1:{color:DARK.text,fontSize:24,fontWeight:'700',marginBottom:8,textAlign:'center'},
  sub:{color:DARK.text2,fontSize:14,textAlign:'center',lineHeight:21},
  onbIcon:{width:80,height:80,borderRadius:24,backgroundColor:'rgba(220,60,60,0.15)',borderWidth:1,borderColor:'rgba(220,60,60,0.3)',alignItems:'center',justifyContent:'center',marginBottom:16},
  onbStep:{flexDirection:'row',gap:14,marginBottom:12,backgroundColor:DARK.surf,borderRadius:14,padding:16,borderWidth:1,borderColor:DARK.border},
  badge:{width:28,height:28,borderRadius:14,backgroundColor:DARK.text4,borderWidth:1,borderColor:DARK.border,alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2},
  badgeTxt:{color:DARK.label,fontSize:10,fontWeight:'700'},
  stepTitle:{color:DARK.text,fontSize:14,fontWeight:'600',marginBottom:4},
  stepDesc:{color:DARK.text2,fontSize:12,lineHeight:18,marginBottom:10},
  tealBtn:{backgroundColor:`${DARK.teal}22`,borderWidth:1,borderColor:`${DARK.teal}55`,borderRadius:10,paddingHorizontal:14,paddingVertical:9,alignSelf:'flex-start'},
  tealBtnTxt:{color:DARK.teal,fontSize:13,fontWeight:'600'},
  yearCard:{backgroundColor:'rgba(232,162,60,0.08)',borderWidth:1,borderColor:'rgba(232,162,60,0.2)',borderRadius:14,padding:18,marginTop:8},
  yearLabel:{color:'rgba(232,162,60,0.7)',fontSize:9,letterSpacing:1.8,textTransform:'uppercase',marginBottom:6},
  yearBig:{color:'#e8a23c',fontSize:38,fontWeight:'300',marginBottom:4},
  yearSub:{color:'rgba(232,162,60,0.55)',fontSize:12,lineHeight:18},
  // blocked
  blockedCard:{backgroundColor:'#0d1520',borderRadius:20,padding:18,marginBottom:14,borderWidth:1,borderColor:'rgba(220,60,60,0.22)'},
  blockedTop:{flexDirection:'row',alignItems:'center',marginBottom:16},
  lockBox:{width:44,height:44,borderRadius:12,backgroundColor:'rgba(220,60,60,0.22)',borderWidth:1,borderColor:'rgba(220,60,60,0.4)',alignItems:'center',justifyContent:'center'},
  blockedTitle:{color:'#fff',fontSize:17,fontWeight:'700'},
  blockedSub:{color:'rgba(255,255,255,0.45)',fontSize:12,marginTop:1},
  recDot:{width:10,height:10,borderRadius:5,backgroundColor:'#cc2200'},
  blockedMeta:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},
  blockedMetaL:{color:'rgba(255,255,255,0.55)',fontSize:13,fontWeight:'500'},
  manageBtn:{color:'#4a90d9',fontSize:13,fontWeight:'600'},
  appPill:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'rgba(200,50,50,0.20)',borderWidth:1,borderColor:'rgba(200,50,50,0.38)',borderRadius:20,paddingHorizontal:12,paddingVertical:8},
  pillTxt:{color:'rgba(255,255,255,0.88)',fontSize:13,fontWeight:'500'},
  breatheBtn:{flexDirection:'row',alignItems:'center',backgroundColor:'#2563eb',borderRadius:14,padding:16,gap:12},
  breatheTitle:{color:'#fff',fontSize:16,fontWeight:'700'},
  breatheSub:{color:'rgba(255,255,255,0.65)',fontSize:12},
  timerBadge:{flexDirection:'row',alignItems:'center',gap:3,backgroundColor:'rgba(255,255,255,0.18)',borderRadius:10,paddingHorizontal:8,paddingVertical:4},
  timerTxt:{color:'#fff',fontSize:12,fontWeight:'600'},
  // pool
  poolCard:{backgroundColor:'rgba(164,142,232,0.1)',borderWidth:1,borderColor:'rgba(164,142,232,0.22)',borderRadius:14,padding:18,marginBottom:14},
  poolL:{color:'rgba(164,142,232,0.7)',fontSize:9,letterSpacing:2,textTransform:'uppercase',marginBottom:6},
  poolN:{color:'#a48ee8',fontSize:36,fontWeight:'300',marginBottom:4},
  poolS:{color:'rgba(164,142,232,0.6)',fontSize:12},
  // spend rows
  spendRow:{flexDirection:'row',gap:12,backgroundColor:DARK.surf,borderRadius:13,padding:14,marginBottom:10,borderWidth:1,borderColor:DARK.border},
  dot:{width:36,height:36,borderRadius:9,alignItems:'center',justifyContent:'center',flexShrink:0},
  dotTxt:{color:'rgba(255,255,255,0.92)',fontSize:10,fontWeight:'700'},
  spendName:{color:DARK.text,fontSize:14,fontWeight:'500'},
  spendBtn:{borderRadius:8,paddingHorizontal:10,paddingVertical:6,borderWidth:1},
  spendBtnTxt:{fontSize:12,fontWeight:'600'},
  // setup
  authBanner:{flexDirection:'row',alignItems:'center',borderWidth:1,borderRadius:13,padding:13,marginBottom:14},
  blockBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'rgba(220,60,60,0.15)',borderWidth:1,borderColor:'rgba(220,60,60,0.35)',borderRadius:14,padding:16,marginBottom:8},
  blockBtnTxt:{color:'#e05555',fontSize:15,fontWeight:'700'},
  limCard:{backgroundColor:DARK.surf,borderWidth:1,borderColor:DARK.border,borderRadius:13,overflow:'hidden'},
  limHead:{flexDirection:'row',alignItems:'center',padding:13,paddingHorizontal:15},
  limRow:{flexDirection:'row',alignItems:'center',gap:8,padding:9,paddingHorizontal:15,backgroundColor:DARK.text4,borderTopWidth:1,borderTopColor:DARK.border},
  stepBtn:{width:26,height:26,borderRadius:13,backgroundColor:DARK.surf,borderWidth:1,borderColor:DARK.border,alignItems:'center',justifyContent:'center'},
  stepTxt:{color:DARK.text,fontSize:15,lineHeight:18},
  limVal:{color:DARK.text,fontSize:14,fontWeight:'700',minWidth:32,textAlign:'center'},
  applyBtn:{marginLeft:'auto' as any,backgroundColor:`${DARK.teal}18`,borderWidth:1,borderColor:`${DARK.teal}44`,borderRadius:8,paddingHorizontal:10,paddingVertical:5},
  applyTxt:{color:DARK.teal,fontSize:11,fontWeight:'600'},
});
