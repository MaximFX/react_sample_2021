import SortingService from "./SortingService";
import FilterService from "./FilterService";
import PaginationService from "./PaginationService";
import CurrentUrlService from "./CurrentUrlService";
import {consoleException} from "../../exceptions/functions";


class ItemsServiceContainer{

    constructor(key, srcPath) {
        this.key = key;

        /**
         * Важно, чтобы все сервисы создавались без ошибок, даже если на странице нет какого либо функционала.
         */
        this.sortingService = new SortingService(this, srcPath);
        this.filterService = new FilterService(this);
        this.paginationService = new PaginationService(this, srcPath);
        this.currentUrlService = new CurrentUrlService(this);
    }

    /**
     *
     * @returns {SortingService}
     */
    getSortingService(){
        return this.sortingService;
    }

    /**
     *
     * @returns {FilterService}
     */
    getFilterService(){
        return this.filterService;
    }

    /**
     *
     * @returns {PaginationService}
     */
    getPaginationService(){
        return this.paginationService;
    }

    /**
     *
     * @returns {CurrentUrlService}
     */
    getCurrentUrlService(){
        return this.currentUrlService;
    }
}

/**
 * Отличие itemsServiceContainerSingleton от serviceContainerSingleton в том, что тут проработа структура контейнера и списка сервисов, а в serviceContainerSingleton
 * сервисы создаются при вызове registerServiceContainer смотри файл ServiceContainer.js
 * @type {Array}
 */
var itemsServiceContainerSingleton = [];

/**
 * @param containerKey - идентификатор контейнера объектов, используется при вызове компонентов Filter, Sorting, Pagination
 * для каждого containerKey будет создана своя связка сервисов
 * Варианты containerKey смотри ниже
 * @returns {ItemsServiceContainer}
 */
export function getItemsServiceContainer(containerKey, srcPath){

    if (containerKey === undefined) consoleException({message: "Нужно указать containerKey при вызове getItemsServiceContainer"})

    if (itemsServiceContainerSingleton[containerKey] === undefined) {
        itemsServiceContainerSingleton[containerKey] = new ItemsServiceContainer(containerKey, srcPath)
    }

    return itemsServiceContainerSingleton[containerKey];
}


