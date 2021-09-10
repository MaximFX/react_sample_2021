import store from '../../globalStore/globalStore'
import {setAjaxProduct, setPagination, startWaitAjaxProduct} from "../../globalStore/actions/currentPageAC";
import {isMobile} from "../../functions/isMobile";


/**
 * ИСПОЛЬЗОВАТЬ ТОЛЬКО ЧЕРЕЗ
 * @see ItemsServiceContainer
 */
export default class SortingService {

    constructor(container = null, srcPath) {

        /**@see ItemsServiceContainer*/
        this.container = container;
        this.srcPath = srcPath;
        const state = store.getState();
        this.sorting = state.currentPage.sorting;
        this.initSelected(this.sorting);

        this.onChangeCallback = [];

    }

    setIsChangeUrl(isChangeUrl){
        this.isChangeUrl = isChangeUrl;
    }

    /**
    * Callback, при изменении сортировки в сервисе
    * подумай на счет накопления callback функций, в иделае callback`и вешать в конструкторе корневого компонента
    * Пример, в контейнере товаров был создан синглтон этого сервиса. А в конструкторе дочернего происходит регистрация callback
    * Если по дальнейшей логике, дочерний компонент будет удаляться со странице, и появлятся заново (Mount, Unmount), то у него будет запускаться
    * снова constructor и накапливаться привязки callback`ов
     *
     * РЕАЛИЗОВАЛ В СЕРВИСЕ СОЗДАНИЯ ОТЗЫВА
    */
    setOnChangeCallback(callback){
        if (!this.onChangeCallback.includes(callback)){
            this.onChangeCallback.push(callback);
        }
    }


    executeCallback(callbackArray){
        if (Array.isArray(callbackArray) && callbackArray.length > 0) {
            callbackArray.map(callback => typeof callback === "function" && callback());
        }
    }

    changeSort(sorting){
        this.sorting = {...this.sorting, ...sorting};
        this.initSelected(sorting);
        this.executeCallback(this.onChangeCallback);

        //Во время изменения сортировки, мы должны сбросить пагинацию на 1 страницу
        this.container.getPaginationService().resetCurrentPage();
    }

    initSelected(sorting) {
        if(sorting) {
            for(let key in this.sorting.sort_fields) {
                if(sorting.sort===this.sorting.sort_fields[key].field && sorting.dest_sort===this.sorting.sort_fields[key].direction) {
                    this.selected = this.sorting.sort_fields[key];
                }
            }
        }

    }

    getSortFields(){
        return this.sorting !== null && this.sorting !== undefined && this.sorting.sort_fields !== undefined ? this.sorting.sort_fields : [];
    }



    getActiveSort() {

        if (this.hasSort()) {
            return this.selected;
        } else {
            return null;
        }
    }

    hasSort() {
        return this.selected !== null && this.selected !== undefined
    }

    getActiveSortTitle() {

        if (this.hasSort()) {
            return this.selected.title;
        } else {
            return isMobile() ? "Сортировка" : "По умолчанию";
        }
    }

    /**
     *
     * @param srcPath
     * @param sorting = {sort: "field", dest_sort: "direction"}
     */
    sendSortingForm(srcPath, sorting) {

        if (srcPath === null) {
            srcPath = this.srcPath;
        }

        this.changeSort(sorting);

        let url = this.container.getCurrentUrlService().getRelevantUrl();

        this.container.getCurrentUrlService().changeHistoryUrl(url, this.isChangeUrl);

        store.dispatch(startWaitAjaxProduct());

        axios.post(srcPath + this.container.getCurrentUrlService().getQueryString(), {
            url: this.container.getCurrentUrlService().getPathUrl()
        })
        .then((response) => {
            store.dispatch(setAjaxProduct(response.data.objects));
        })
        .catch((data) => {

        })
    }

    /**
     * Требуется в CurrentUrlService для сборки URL
     */
    getCurrentSortConfig(){


        if (this.hasSort()) {
            return [
                {field: "sort", value: this.sorting.sort},
                {field: "dest_sort", value: this.sorting.dest_sort}
            ]
        } else {
            return [];
        }
    }

}
