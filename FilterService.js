import {addArrayItem, removeArrayItem} from "../../functions/arrayHelpers";
import {isMobile} from "../../functions/isMobile";
import {APPLY_FILTER} from "../../constants/api";
import store from '../../globalStore/globalStore'
import {setAjaxProduct, setPagination, startWaitAjaxProduct} from "../../globalStore/actions/currentPageAC";
import {setFilterResult} from "../../globalStore/actions/filterAC";
import {logJsError} from "../../exceptions/functions";

/**
 * ИСПОЛЬЗОВАТЬ ТОЛЬКО ЧЕРЕЗ
 * @see ItemsServiceContainer
 */
export default class FilterService{

    constructor(container = null) {

        /**@see ItemsServiceContainer*/
        this.container = container;

        const state = store.getState();
        this.reInit(state.filter);

        //Единичный фильтр в личном кабинете
        this.simpleFilter = state.currentPage.simpleFilter;


        this.sendFilterTimeout = {
            mobile : 500,
            desktop : 300,
            multiple_choice : false //если клиент начнёт кликать подряд несколько чекбоксов, увеличим в 1,5 раза время ожидания
        };

    }

    /**
     * Лучше реализовать как сделано в сортировке, накапливая коллбеки
     * @param callback
     */
    setBeforeSendCallback(callback){
        this.onBeforeSendCallback = callback;
    }

    /**
     * Лучше реализовать как сделано в сортировке, накапливая коллбеки
     * @param callback
     */
    setAfterSendCallback(callback){
        this.onAfterSendcallback = callback;
    }

    reInit(filter){
        this.selected = {};
        this.filter = filter;
        //Определить выбранные фильтры из полученных данных
        this.initSelected(this.filter.filter_items);
    }


    /**
     * Добавил таймаута на мобиле, т.к. слабее устройства и не нужна такая скорость, т.к. не видно выборки сразу.
     * Но всё равно нужно отправлять запросы, т.к. меняется состав фильтра в зависимости от выбора
     */
    sendFilterForm(timeout, windowUrl) {

        if (this.formSendInterval !== undefined) {
            clearTimeout(this.formSendInterval);
            this.formSendInterval = undefined;

            //если клиент начнёт кликать подряд несколько чекбоксов, увеличим в 1,5 раза время ожидания
            this.sendFilterTimeout.multiple_choice = true;
        }


        this.formSendInterval = setTimeout(() => {
            clearTimeout(this.formSendInterval);
            this.formSendInterval = undefined;

            //после отправки формы нужно сбросить флаг множественный выбор
            this.sendFilterTimeout.multiple_choice = false;

            //Во время изменения фильтра, мы должны сбросить пагинацию на 1 страницу
            this.container.getPaginationService().resetCurrentPage();

            let url = this.container.getCurrentUrlService().getRelevantUrl();

            this.container.getCurrentUrlService().changeHistoryUrl(url, true, windowUrl);

            store.dispatch(startWaitAjaxProduct());

            typeof this.onBeforeSendCallback === "function" && this.onBeforeSendCallback();

            axios.post(APPLY_FILTER + this.container.getCurrentUrlService().getQueryString(), {
                url: this.container.getCurrentUrlService().getPathUrl()
            })
            .then((data) => {
                this.reInit(data.data.filters);

                this.container.getPaginationService().initPagination(data.data.objects.pagination);

                store.dispatch(setFilterResult(data.data.filters));
                store.dispatch(setAjaxProduct(data.data.objects));
                // store.dispatch(setPagination(data.data.objects.pagination));

                typeof this.onAfterSendcallback === "function" && this.onAfterSendcallback(data.data.objects.pagination.total);

            })
            .catch((data) => {
            })

        }, timeout);

    }

    getSendFilterTimeout(){
        return (
            (isMobile() ? this.sendFilterTimeout.mobile : this.sendFilterTimeout.desktop)
        ) * (
            this.sendFilterTimeout.multiple_choice ? 1.5 : 1
        );
    }


    initSelected(items) {

        for (let key in items) {
            if (key === 'PriceFilter') {
                this.selected[key] = {};

                if (typeof (items[key].selected.min_price) !== 'undefined') {
                    this.selected[key] = {min_price: items[key].selected.min_price.toString()};
                }

                if (typeof (items[key].selected.max_price) !== 'undefined') {
                    this.selected[key] = {
                        ...this.selected[key],
                        max_price: items[key].selected.max_price.toString()
                    };
                }

                if (Object.keys(this.selected[key]).length === 0) {
                    delete this.selected[key];
                }

            } else if (key === 'ParamFilter') {
                for (let i in items[key].items) {
                    let param_selected = items[key].items[i].selected;

                    for (let j in param_selected) {

                        if (typeof param_selected[j] === "undefined") {
                            logJsError({
                                "FilterService initSelected ParamFilter": 155
                            })
                        }

                        if (typeof (this.selected[key + i]) === 'undefined') {
                            this.selected[key + i] = [param_selected[j].id.toString()];
                        } else {
                            this.selected[key + i] = addArrayItem(param_selected[j].id.toString(), this.selected[key + i]);
                        }
                    }
                }
            } else if (key === 'MarkerFilter') {
                for (let i in items[key].selected) {
                    if (items[key].selected.hasOwnProperty(i)) {
                        if (typeof (this.selected[key]) === 'undefined') {
                            this.selected[key] = [i];
                        } else {
                            this.selected[key] = addArrayItem(i, this.selected[key]);
                        }
                    }
                }
            } else {
                for (let i in items[key].selected) {
                    if (typeof items[key].selected[i] === "undefined") {
                        logJsError({
                            "FilterService initSelected ParamFilter": 183
                        })
                    }

                    if (typeof (this.selected[key]) === 'undefined') {
                        this.selected[key] = [items[key].selected[i].id.toString()];
                    } else {
                        this.selected[key] = addArrayItem(items[key].selected[i].id.toString(), this.selected[key]);
                    }
                }
            }
        }
        return this.selected;
    }


    hasSelectedFilter() {
        return Object.keys(this.selected).length > 0;
    }

    addSelectPrice(min_price, max_price){
        this.selected["PriceFilter"] = {min_price, max_price};

        this.sendFilterForm(0);
    }

    removeSelectPrice(){
        delete this.selected["PriceFilter"];
        this.sendFilterForm(this.getSendFilterTimeout());
    }



    addSelectItem(index, value, windowUrl){

        const hasSelected = this.hasSelectedFilter();

        if (typeof (this.selected[index]) === 'undefined'){
            this.selected[index] = [value.toString()];
        } else {
            this.selected[index] = addArrayItem(value.toString(), this.selected[index]);
        }
        this.sendFilterForm(this.getSendFilterTimeout(), !hasSelected ? windowUrl : undefined);

    }

    removeAllFilter(){
        this.selected = {};
        this.sendFilterForm(0);
    }

    removeSelectItem(index, value){

        if (typeof (this.selected[index]) === 'undefined'){
            return false;
        } else {
            this.selected[index] = removeArrayItem(value.toString(), this.selected[index]);
            if ( this.selected[index].length === 0){
                delete this.selected[index];
            }
        }

        this.sendFilterForm(this.getSendFilterTimeout());
    }






    getRequestLabel(key) {
        switch (key) {
            case "MarkerFilter":
                return "markers";
            case "BrandFilter":
                return "brands";
            case "LineBrandFilter":
                return "line_brands";
            case "CountryFilter":
                return "countries";
            case "TypeFilter":
                return "types";
        }

        if (key.indexOf("ParamFilter") === 0) {
            let parent_id = key.split("ParamFilter");
            return "params_" + parent_id[1];
        }
    }


    getCurrentFilterConfig() {

        let newGetParams = [];

        if (Object.keys(this.selected).length > 0) {

            newGetParams.push({field: "flt", value: 1});
            newGetParams.push({field: "flt_ajax", value: 1});

            for (let key in this.selected) {
                if(key === "PriceFilter") {

                    if (typeof(this.selected[key].min_price) !== 'undefined') {
                        newGetParams.push({field: "min_price", value: this.selected[key].min_price});
                    }

                    if (typeof(this.selected[key].max_price) !== 'undefined') {
                        newGetParams.push({field: "max_price", value: this.selected[key].max_price});
                    }

                } else {

                    let j_s = 0;
                    let value = "";
                    for (let i = 0; i < this.selected[key].length; i++) {
                        if (typeof (this.selected[key][i]) !== 'undefined') {
                            if (this.selected[key][i] !== '') {
                                if (j_s === this.selected[key].length - 1) {
                                    value += this.selected[key][i];
                                } else {
                                    value += this.selected[key][i] + ';';
                                }

                            }
                        }
                        j_s++;
                    }

                    newGetParams.push({field: this.getRequestLabel(key), value: value});

                }

            }

        }


        if (this.filter !== undefined && this.filter.searchWord !== '' && this.filter.searchWord !== null) {
            newGetParams.push({field: "searchword", value: this.filter.searchWord});
        }


        if (this.simpleFilter !== '') {
            newGetParams.push({field: "filter", value: this.simpleFilter});
        }




        return newGetParams;
    }
}
