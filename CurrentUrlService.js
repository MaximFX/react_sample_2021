import store from "../../globalStore/globalStore";
import {TryCatchDecorator} from "../../components/Utils/TryCatchDecorator";
import changeHistoryUrl from "../../functions/popstate/changeHistoryUrl";
import {defined, definedText} from "../../functions/defined";
import 'url-search-params-polyfill';

/**
 * Еще не продумано как будет работать, если на странице будет несколько пагинаций, от куда брать базовые урл current_url
 */
export default class CurrentUrlService{

    constructor(container) {

        /**@see ItemsServiceContainer*/
        this.container = container;

        const state = store.getState();

        let current_url = defined(state.currentPage) && defined(state.currentPage.current_full_url) ? state.currentPage.current_full_url : "/";
        this.setCurrentUrl(current_url);
    }

    setCurrentUrl(url = ""){
        this.currentFullUrl = url;

        let parts = url.split("?");

        this.currentPathUrl = parts[0];

        this.currentQueryString = parts.length >= 2 ? parts[1] : '';

    }

    getFullUrl() {
        return this.currentFullUrl;
    }

    getPathUrl() {
        return this.currentPathUrl;
    }

    //with "?"
    getQueryString() {
        return this.currentQueryString !== "" ? "?" + this.currentQueryString : "";
    }

    /**
     * Используется только для работы в связке с сервис контейнером ItemsServiceContainer
     * @param url
     * @param isChangeBrowserUrl
     * @param windowUrl
     */
    changeHistoryUrl(url, isChangeBrowserUrl = true, windowUrl){
        this.setCurrentUrl(url);
        isChangeBrowserUrl && changeHistoryUrl(definedText(windowUrl) ? windowUrl : url);
    }

    changeCurrentPageTitle(new_title){
        document.title = new_title;
    }

    getRelevantUrl(only_query = false){


        let params = [
            ...this.container.getFilterService().getCurrentFilterConfig(),
            ...this.container.getSortingService().getCurrentSortConfig(),
            ...this.container.getPaginationService().getCurrentPageConfig(),
        ];

        return (only_query ? "" : this.getPathUrl()) + this.setQueryParam(
            "",
            params
        );
    }






    /**
     * Вернет или пустую строку, или строку начинающуюся с "?"
     * @param url
     * @param values array of objects {field: "", value: ""}
     * @returns {string}
     */
    @TryCatchDecorator
    setQueryParam(url, values) {
        let params = new URLSearchParams(url);

        values.map((param) => {
            if (param.value !== undefined && param.field !== undefined) {
                params.set(param.field, param.value);
            }  else {
                params.delete(param.field);
            }
        });

        let new_params = params.toString();

        return new_params !== "" ? '?' + params.toString() : "";
    }
}
