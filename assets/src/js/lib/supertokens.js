import SuperTokens from 'supertokens-web-js';
import Session from 'supertokens-web-js/recipe/session';
import Passwordless, { createCode, consumeCode, signOut } from "supertokens-web-js/recipe/passwordless";

function preAPIHook(csrf) {
    return function(context) {
        let requestInit = context.requestInit;
        let url = context.url;
        let headers = {
            ...requestInit.headers,
            'X-CSRF-TOKEN': csrf,
        };
        requestInit = {
            ...requestInit,
            headers,
        }
        return {
            requestInit, url
        };
    }
}

export async function sendMagicLink({email}, csrf) {
    await initSuperTokens(csrf);
    return await createCode({
        email,
        options: {
            preAPIHook: preAPIHook(csrf),
        },
    });
}

export async function handleMagicLinkClicked(csrf) {
    await initSuperTokens(csrf);
    return await consumeCode({
        options: {
            preAPIHook: preAPIHook(csrf),
        },
    });
}

export async function logout(csrf) {
    await initSuperTokens(csrf);
    return await signOut({
        options: {
            preAPIHook: preAPIHook(csrf),
        },
    });
}

export async function refresh(csrf) {
    await initSuperTokens(csrf);
    return Session.attemptRefreshingSession();
}

export async function init(csrf) {
    await initSuperTokens(csrf);
}

let inited = false;
async function initSuperTokens(csrf) {
    if (inited) {
        return;
    }
    inited = true;
    SuperTokens.init({
        appInfo: {
            apiDomain:   window._domain,
            apiBasePath: '/auth',
            appName:     'webtor',
        },
        recipeList: [
            Session.init({
                preAPIHook: preAPIHook(csrf),
            }),
            Passwordless.init(),
        ],
    });

}
