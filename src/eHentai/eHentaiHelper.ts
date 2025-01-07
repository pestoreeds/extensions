import {
    MangaTile,
    RequestManager,
    SourceStateManager
} from 'paperback-extensions-common'

import { parseTitle } from './eHentaiParser'

export async function getGalleryData(ids: string[], requestManager: RequestManager): Promise<any> {
    const request = createRequestObject({
        url: 'https://api.e-hentai.org/api.php',
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        data: {
            'method': 'gdata',
            'gidlist': ids.map(id => id.split('/')),
            'namespace': 1
        }
    })

    const data = await requestManager.schedule(request, 1)
    const json = (typeof data.data == 'string') ? JSON.parse(data.data.replaceAll(/[\r\n]+/g, ' ')) : data.data
    return json.gmetadata
}

export async function getSearchData(query: string | undefined, page: string, categories: number, requestManager: RequestManager, cheerio: CheerioAPI, stateManager: SourceStateManager): Promise<MangaTile[]> {
   
    if (query != undefined && query.length != 0 && query.split(' ').filter(q => !q.startsWith('-')).length != 0 && await stateManager.retrieve('extraSearchArgs')) 
        query += ` ${await stateManager.retrieve('extraSearchArgs')}`
    
    const url = (page ==  '') ? (`https://e-hentai.org/?f_cats=${categories}&f_search=${encodeURIComponent(query ?? '')}`) : page
    throw new Error(url)
    const request = createRequestObject({
        url: url
        method: 'GET'
    })

    const data = await requestManager.schedule(request, 1)
    const $ = cheerio.load(data.data)

    const searchResults = $('td.glname').toArray()
    const mangaIds = []
    for (const manga of searchResults) {
        const splitURL = ($('a', manga).attr('href') ?? '/////').split('/')
        mangaIds.push(`${splitURL[4]}/${splitURL[5]}`)
    }

    const json = mangaIds.length != 0 ? await getGalleryData(mangaIds, requestManager) : []
    const results = []

    const next = $('#unext').attr('href') ?? ''

    for (const entry of json) {
        results.push(createMangaTile({
            id: `${entry.gid}/${entry.token}`,
            title: createIconText({ text: parseTitle(entry.title) }),
            image: entry.thumb
        }))
    }

    results.push(createMangaTile({
        id: next,
        title: createIconText({ text: '' }),
        image: ''
    }))

    return results
}
