package com.nexora.customer

import android.webkit.WebView
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

@RunWith(AndroidJUnit4::class)
class CustomerUiTest {
    private val prepared=mutableSetOf<WebView>()
    internal fun js(s:ActivityScenario<MainActivity>,script:String):String {
        val value=AtomicReference("");val latch=CountDownLatch(1)
        s.onActivity { val web=it.findViewById<WebView>(R.id.customer_web);if(web==null){value.set("__WEB_PENDING__");latch.countDown()}else if(prepared.add(web)&&TestNetworkTransport.install(web)){web.reload();value.set("__TRANSPORT_READY__");latch.countDown()}else web.evaluateJavascript(script) { r->value.set(r);latch.countDown() } }
        assertTrue("WebView did not respond",latch.await(35,TimeUnit.SECONDS));return value.get()
    }
    internal fun until(s:ActivityScenario<MainActivity>,label:String,script:String,seconds:Int=180) {
        val end=System.currentTimeMillis()+seconds*1000
        do { if(js(s,script)=="true")return;Thread.sleep(700) } while(System.currentTimeMillis()<end)
        fail(label+"; page="+js(s,"document.body.innerText.slice(0,1200)"))
    }
    internal fun tab(s:ActivityScenario<MainActivity>,name:String) { js(s,"Array.from(document.querySelectorAll('nav[aria-label=\\\"Customer app navigation\\\"] button')).find(x=>x.textContent.trim()===${org.json.JSONObject.quote(name)})?.click()") }
    internal fun screenshot(name:String) {
        Thread.sleep(400) // Capture the rendered frame after a successful DOM assertion.
        val i=androidx.test.platform.app.InstrumentationRegistry.getInstrumentation()
        val directory=java.io.File(i.targetContext.getExternalFilesDir(null),"qa").apply{mkdirs()}
        i.uiAutomation.takeScreenshot()?.let { bitmap -> java.io.File(directory,name+".png").outputStream().use { bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,it) };bitmap.recycle() }
    }
    @Test fun completeHomeAndAllSixTabs() {
        ActivityScenario.launch(MainActivity::class.java).use { s ->
            until(s,"Home missing","!!document.querySelector('.cr-app nav')")
            assertEquals("6",js(s,"document.querySelectorAll('nav[aria-label=\\\"Customer app navigation\\\"] button').length"))
            until(s,"Live home sections missing","['Festival Offers','Smart Recommendations','Service Categories','Trending Salon Reels','Quick Services','Recommended Salons'].every(x=>document.body.innerText.toLowerCase().includes(x.toLowerCase()))",120)
            screenshot("home");tab(s,"Explore");until(s,"Explore missing","document.body.innerText.includes('Explore & Discover Salons')")
            assertEquals("true",js(s,"!!Array.from(document.querySelectorAll('button')).find(x=>x.textContent.trim()==='Map View')"))
            screenshot("explore");for(name in listOf("My Bookings","Rewards","Favorites","Profile")) {
                tab(s,name);val key=when(name){"My Bookings"->"bookings";else->name.lowercase()};until(s,"Tab missing: $name","location.search.includes('tab=$key')")
                assertEquals("false",js(s,"document.body.innerText.includes('This screen could not open')"))
            }
            tab(s,"Home");until(s,"Home did not return","!!document.querySelector('.cr-zip-home')")
        }
    }
    @Test fun nativeClipboardRoundTrip() {
        ActivityScenario.launch(MainActivity::class.java).use { s ->
            until(s,"App missing","!!document.querySelector('.cr-app nav')")
            js(s,"navigator.clipboard.writeText('Nexora QA clipboard').then(()=>document.body.dataset.qaCopy='done',()=>document.body.dataset.qaCopy='failed')")
            until(s,"Native clipboard acknowledgement missing","document.body.dataset.qaCopy==='done'")
            val context=androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().targetContext
            val value=AtomicReference("")
            s.onActivity { value.set(context.getSystemService(android.content.ClipboardManager::class.java).primaryClip?.getItemAt(0)?.text?.toString().orEmpty()) }
            assertEquals("Nexora QA clipboard",value.get())
        }
    }
    @Test fun liveSlotsReachSummaryWithoutReservation() {
        ActivityScenario.launch(MainActivity::class.java).use { s ->
            until(s,"Live home missing","!!Array.from(document.querySelectorAll('button')).find(x=>x.textContent.trim()==='Book Style')",180)
            js(s,"Array.from(document.querySelectorAll('button')).find(x=>x.textContent.trim()==='Book Style').click()")
            until(s,"Service selection missing","document.body.innerText.includes('Continue to Specialist & Slot')")
            js(s,"Array.from(document.querySelectorAll('button')).find(x=>x.textContent.trim()==='Continue to Specialist & Slot').click()")
            until(s,"No usable live slots","document.querySelectorAll('.cr-slot-grid button').length>0",180)
            screenshot("booking-live-slots")
            js(s,"document.querySelector('.cr-slot-grid button').click()")
            until(s,"Selected slot not ready","!!Array.from(document.querySelectorAll('button')).find(x=>x.textContent.trim()==='Confirm Booking'&&!x.disabled)")
            js(s,"Array.from(document.querySelectorAll('button')).find(x=>x.textContent.trim()==='Confirm Booking').click()")
            until(s,"Booking summary missing","document.body.innerText.includes('25% Advance Deposit (Pay Now)')&&document.body.innerText.includes('Pay at Salon)')")
            screenshot("booking-summary")
            // Stop at the summary. Payment/reservation controls are intentionally never clicked.
            js(s,"document.querySelector('button[aria-label=\\\"Close booking\\\"]')?.click()")
        }
    }
    @Test fun passwordEyeAndDobCalendar() {
        ActivityScenario.launch(MainActivity::class.java).use { s ->
            until(s,"App missing","!!document.querySelector('.cr-app nav')");tab(s,"Profile")
            until(s,"Guest profile not ready","document.body.innerText.includes('Sign in / Create customer account')")
            js(s,"Array.from(document.querySelectorAll('button')).find(x=>/sign in/i.test(x.textContent))?.click()")
            until(s,"Login missing","!!document.querySelector('input[type=password]')");screenshot("login")
            js(s,"document.querySelector('button[aria-label=\\\"Show password\\\"]')?.click()")
            until(s,"Password did not become visible","!!document.querySelector('button[aria-label=\\\"Hide password\\\"]')")
            js(s,"document.querySelector('button[aria-label=\\\"Hide password\\\"]')?.click()")
            until(s,"Password did not become hidden","!!document.querySelector('input[type=password]')")
            js(s,"Array.from(document.querySelectorAll('button')).find(x=>/create account|sign up/i.test(x.textContent))?.click()")
            until(s,"Signup calendar missing","!!document.querySelector('.customer-birth-date input[type=date]')")
            js(s,"document.querySelector('.customer-birth-date').scrollIntoView({block:'center'})")
            Thread.sleep(700)
            val point=org.json.JSONArray(js(s,"(()=>{const r=document.querySelector('.customer-birth-date').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,document.documentElement.clientWidth]})()"))
            val position=IntArray(2);var scale=1f;s.onActivity { val w=it.findViewById<WebView>(R.id.customer_web);w.getLocationOnScreen(position);scale=w.width.toFloat()/point.getDouble(2).toFloat() }
            val i=androidx.test.platform.app.InstrumentationRegistry.getInstrumentation()
            val now=android.os.SystemClock.uptimeMillis();val x=position[0]+point.getDouble(0).toFloat()*scale;val y=position[1]+point.getDouble(1).toFloat()*scale
            for(action in listOf(android.view.MotionEvent.ACTION_DOWN,android.view.MotionEvent.ACTION_UP)) {
                val event=android.view.MotionEvent.obtain(now,android.os.SystemClock.uptimeMillis(),action,x,y,0);i.sendPointerSync(event);event.recycle()
            }
            fun containsPicker(node:android.view.accessibility.AccessibilityNodeInfo?):Boolean {
                if(node==null)return false
                if(node.className?.toString()=="android.widget.DatePicker")return true
                return (0 until node.childCount).any { containsPicker(node.getChild(it)) }
            }
            val end=System.currentTimeMillis()+30000
            while(!containsPicker(i.uiAutomation.rootInActiveWindow)&&System.currentTimeMillis()<end)Thread.sleep(500)
            assertTrue("Native DOB calendar did not open",containsPicker(i.uiAutomation.rootInActiveWindow));screenshot("native-calendar")
            i.sendKeyDownUpSync(android.view.KeyEvent.KEYCODE_BACK)
            js(s,"(()=>{const x=document.querySelector('.customer-birth-date input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(x,'2000-02-09');x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}))})()")
            until(s,"DOB not DD-MM-YYYY","document.querySelector('.customer-birth-date').innerText.includes('09-02-2000')")
            assertEquals("true",js(s,"document.querySelector('.customer-birth-date input').required"));screenshot("signup-dob")
        }
    }
    @Test fun restartDoesNotLeaveBlankScreen() {
        ActivityScenario.launch(MainActivity::class.java).use { s ->
            until(s,"Initial home missing","!!document.querySelector('.cr-app nav')");s.recreate()
            until(s,"Blank screen after recreation","!!document.querySelector('.cr-app nav')")
        }
    }
    @Test fun recreateDuringStartupStillShowsHome() {
        ActivityScenario.launch(MainActivity::class.java).use { s ->
            // Exercise a late asynchronous engine callback belonging to a destroyed Activity.
            s.recreate()
            until(s,"Home missing after startup recreation","!!document.querySelector('.cr-app nav')")
            screenshot("startup-recreated-home")
        }
    }

}
