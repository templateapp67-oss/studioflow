package com.nexora.customer

import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

/** Run separately after the guest suite, with disposable QA credentials. Creates no booking. */
@RunWith(AndroidJUnit4::class)
class AuthenticatedCustomerUiTest {
    @Test fun registrationDetailsAndSavedProfileSurviveLogin() {
        val args=InstrumentationRegistry.getArguments()
        val email=requireNotNull(args.getString("qaEmail"));val password=requireNotNull(args.getString("qaPassword"))
        val h=CustomerUiTest()
        fun quote(value:String)=org.json.JSONObject.quote(value)
        ActivityScenario.launch(MainActivity::class.java).use { s ->
            fun click(text:String) { h.js(s,"Array.from(document.querySelectorAll('button')).find(x=>x.textContent.trim()===${quote(text)})?.click()") }
            fun fill(selector:String,value:String) { h.js(s,"(()=>{const x=document.querySelector(${quote(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(x,${quote(value)});x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}))})()") }
            fun login() {
                h.tab(s,"Profile")
                h.until(s,"Profile state missing","document.body.innerText.includes('Sign in / Create customer account')||document.body.innerText.includes("+quote(email)+")")
                if(h.js(s,"document.body.innerText.includes("+quote(email)+")&&!!document.querySelector('.cr-profile-logout')")=="true") {
                    click("Log Out")
                }
                h.until(s,"Guest profile missing","document.body.innerText.includes('Sign in / Create customer account')&&localStorage.getItem('studioflow_supabase_session')===null")
                click("Sign in / Create customer account");h.until(s,"Login form missing","!!document.querySelector('input[type=password]')")
                fill("input[type=email]",email);fill("input[type=password]",password)
                h.js(s,"document.querySelector('input[type=password]').form.requestSubmit()")
                h.until(s,"QA sign-in failed","document.body.innerText.includes('Nexora Android QA')")
            }
            h.until(s,"App missing","!!document.querySelector('.cr-app nav')");login();click("Edit profile")
            h.until(s,"Registration data not fetched","document.querySelector('input[autocomplete=tel]')?.value==='+919876543210'&&document.querySelector('.customer-birth-date input')?.value==='2000-02-09'")
            h.screenshot("profile-prefilled")
            fill("input[autocomplete=name]","Nexora Android QA Updated");fill(".customer-birth-date input","2001-03-10");click("Save profile")
            h.until(s,"Profile save missing","document.body.innerText.includes('Profile details saved.')");click("Log Out")
            h.until(s,"Logout missing","document.body.innerText.includes('Sign in / Create customer account')");login();click("Edit profile")
            h.until(s,"Profile did not persist after login","document.querySelector('input[autocomplete=name]')?.value==='Nexora Android QA Updated'&&document.querySelector('input[autocomplete=tel]')?.value==='+919876543210'&&document.querySelector('.customer-birth-date').innerText.includes('10-03-2001')")
            h.screenshot("profile-relogin")
            h.tab(s,"Home")
            h.until(s,"Live services missing","!!Array.from(document.querySelectorAll('button')).find(x=>x.textContent.trim()==='Book Style')")
            click("Book Style");h.until(s,"Booking selection missing","document.body.innerText.includes('Continue to Specialist & Slot')")
            click("Continue to Specialist & Slot");h.until(s,"Live booking slots missing","document.querySelectorAll('.cr-slot-grid button').length>0")
            h.js(s,"document.querySelector('.cr-slot-grid button').click()")
            h.until(s,"Selected slot not ready","!!Array.from(document.querySelectorAll('button')).find(x=>x.textContent.trim()==='Confirm Booking'&&!x.disabled)")
            click("Confirm Booking")
            h.until(s,"Booking asks for registration details again","document.querySelector('input[autocomplete=name]')?.value==='Nexora Android QA Updated'&&document.querySelector('input[autocomplete=tel]')?.value==='+919876543210'")
            h.js(s,"document.querySelector('input[autocomplete=name]').scrollIntoView({block:'center'})")
            h.screenshot("booking-contact-prefilled")
            // Do not click any reserve or payment control.
        }
    }
}
